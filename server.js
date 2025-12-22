const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mysql = require('mysql2/promise');
const http = require('http');
const { Server } = require('socket.io');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

// Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.SENDER_EMAIL,
        pass: process.env.SENDER_PASSWORD
    }
});

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'health_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: {
        rejectUnauthorized: false
    }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- Auth Routes ---

app.post('/register', async (req, res) => {
    try {
        const { mobile, name, age, dob, gender, address, state, hidn, hid } = req.body;

        if (!mobile || !name) {
            return res.status(400).json({ error: "Mobile and Name are required." });
        }

        const query = `
            INSERT INTO users (mobile, name, age, dob, gender, address, state, hidn, hid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            name=VALUES(name), age=VALUES(age), dob=VALUES(dob), gender=VALUES(gender), 
            address=VALUES(address), state=VALUES(state), hidn=VALUES(hidn), hid=VALUES(hid)
        `;

        await pool.execute(query, [mobile, name, age, dob, gender, address, state, hidn, hid]);
        res.json({ success: true, message: "User registered successfully." });

    } catch (error) {
        console.error("Registration Error:", error);
        res.status(500).json({ error: "Database error during registration." });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile) return res.status(400).json({ error: "Mobile number required." });

        const [rows] = await pool.execute('SELECT * FROM users WHERE mobile = ?', [mobile]);

        if (rows.length > 0) {
            res.json({ success: true, user: rows[0] });
        } else {
            res.status(404).json({ error: "User not found. Please register." });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "Database error during login." });
    }
});

app.get('/user/:mobile', async (req, res) => {
    try {
        const mobile = req.params.mobile;
        const [rows] = await pool.execute('SELECT name, age, gender FROM users WHERE mobile = ?', [mobile]);
        
        if (rows.length > 0) {
            res.json(rows[0]);
        } else {
            res.status(404).json({ error: "User not found" });
        }
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Database error" });
    }
});

app.get('/history/:mobile', async (req, res) => {
    try {
        const mobile = req.params.mobile;
        
        // Fetch User Details
        const [userRows] = await pool.execute('SELECT * FROM users WHERE mobile = ?', [mobile]);
        if (userRows.length === 0) return res.status(404).json({ error: "User not found" });
        const user = userRows[0];

        // Fetch Health Data & AI Responses
        const query = `
            SELECT d.id, d.created_at, d.symptoms, d.height, d.weight, d.temperature, d.spo2, d.heartrate, 
                   a.response_text,
                   dr.doctor_notes, dr.prescription, doc.name as doctor_name
            FROM data d 
            LEFT JOIN ai_response a ON d.id = a.data_id 
            LEFT JOIN consultation_requests cr ON d.id = cr.data_id
            LEFT JOIN doctor_responses dr ON cr.id = dr.consultation_id
            LEFT JOIN doctors doc ON cr.doctor_id = doc.id
            WHERE d.user_mobile = ? 
            ORDER BY d.created_at DESC
        `;
        const [historyRows] = await pool.execute(query, [mobile]);

        res.json({ user, history: historyRows });

    } catch (error) {
        console.error("Error fetching history:", error);
        res.status(500).json({ error: "Database error" });
    }
});

// --- Analysis Route ---

app.post('/analyze', async (req, res) => {
    try {
        const { vitals, symptoms, user_mobile } = req.body;

        if (!user_mobile) {
            return res.status(401).json({ error: "User not authenticated." });
        }

        // 1. Save Health Data
        const symptomsStr = JSON.stringify(symptoms);
        const dataQuery = `
            INSERT INTO data (user_mobile, height, weight, temperature, spo2, heartrate, symptoms)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        const [dataResult] = await pool.execute(dataQuery, [
            user_mobile, vitals.height, vitals.weight, vitals.temperature, vitals.spo2, vitals.heartrate, symptomsStr
        ]);
        const dataId = dataResult.insertId;

        // 2. Construct Prompt
        const prompt = `
        Act as a medical AI assistant. Analyze the following patient data and symptoms.
        
        Patient Vitals:
        - Height: ${vitals.height}
        - Gender: ${vitals.gender}
        - Age: ${vitals.age}
        - Weight: ${vitals.weight}
        - Temperature: ${vitals.temperature}
        - SpO2: ${vitals.spo2}
        - Heart Rate: ${vitals.heartrate}

        Selected Symptoms:
        ${symptoms.join(', ')}

        Based on this information, provide a diagnosis of the potential problem(s) and prescribe medicines.
        
        Output Format:
        Problem: [Problem/Diagnosis]
        Medicines:
        - [Medicine Name] - [Amount/Dosage] - [Frequency (e.g., 1-0-1)]
        
        Provide only the output in the specified format. Do not include disclaimers in the output text (I will handle them in the UI).
        `;

        // 3. Call Gemini API
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        let result;
        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                result = await model.generateContent(prompt);
                break;
            } catch (error) {
                attempts++;
                if ((error.status === 503 || error.message.includes('503')) && attempts < maxAttempts) {
                    console.log(`Attempt ${attempts} failed with 503 (Model Overloaded). Retrying in 2 seconds...`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw error;
                }
            }
        }

        const response = await result.response;
        const text = response.text();

        // 4. Save AI Response
        const aiQuery = `INSERT INTO ai_response (data_id, response_text) VALUES (?, ?)`;
        await pool.execute(aiQuery, [dataId, text]);

        res.json({ result: text, dataId: dataId });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: "Failed to analyze symptoms." });
    }
});

// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// --- Socket.IO Logic ---
const doctors = new Set(); // Track online doctors

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('doctor_login', (doctorId) => {
        socket.join('doctors');
        doctors.add(socket.id);
        console.log(`Doctor ${doctorId} joined. Online doctors: ${doctors.size}`);
    });

    socket.on('patient_request', (data) => {
        // Broadcast to all doctors
        if (doctors.size === 0) {
            socket.emit('no_doctors_available');
            // Trigger email logic here if needed
        } else {
            io.to('doctors').emit('new_patient_request', {
                ...data,
                socketId: socket.id
            });
        }
    });

    socket.on('accept_request', async (data) => {
        // data: { patientSocketId, doctorId, consultationId }
        
        // Update DB
        if (data.consultationId && data.doctorId) {
            try {
                await pool.execute(
                    'UPDATE consultation_requests SET doctor_id = ?, status = "accepted" WHERE id = ?', 
                    [data.doctorId, data.consultationId]
                );
            } catch (e) {
                console.error('Error updating consultation request:', e);
            }
        }

        io.to(data.patientSocketId).emit('request_accepted', { doctorId: data.doctorId, doctorSocketId: socket.id });
        
        // Notify other doctors to remove this request from their queue
        io.to('doctors').emit('request_taken', { patientSocketId: data.patientSocketId });
    });

    // WebRTC Signaling
    socket.on('offer', (data) => {
        io.to(data.target).emit('offer', { sdp: data.sdp, sender: socket.id });
    });

    socket.on('answer', (data) => {
        io.to(data.target).emit('answer', { sdp: data.sdp, sender: socket.id });
    });

    socket.on('candidate', (data) => {
        io.to(data.target).emit('candidate', { candidate: data.candidate, sender: socket.id });
    });

    socket.on('consultation_completed', (data) => {
        io.to(data.target).emit('consultation_completed', { 
            notes: data.notes, 
            prescription: data.prescription 
        });
    });

    socket.on('disconnect', () => {
        if (doctors.has(socket.id)) {
            doctors.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

// --- Doctor Routes ---

app.post('/doctor/register', async (req, res) => {
    try {
        const { name, email, password, specialization, location, hospital, contact_no, gender } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const query = `INSERT INTO doctors (name, email, password, specialization, location, hospital, contact_no, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await pool.execute(query, [name, email, hashedPassword, specialization, location, hospital, contact_no, gender]);
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Registration failed" });
    }
});

app.post('/doctor/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.execute('SELECT * FROM doctors WHERE email = ?', [email]);
        
        if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
        
        const doctor = rows[0];
        const match = await bcrypt.compare(password, doctor.password);
        
        if (match) {
            res.json({ success: true, doctor: { id: doctor.id, name: doctor.name } });
        } else {
            res.status(401).json({ error: "Invalid credentials" });
        }
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
});

// Get Doctor's Patients (History)
app.get('/doctor/patients/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const query = `
            SELECT cr.id, cr.created_at, u.name as patient_name, u.age, u.gender, d.symptoms, ar.response_text as diagnosis, dr.doctor_notes, dr.prescription
            FROM consultation_requests cr
            JOIN users u ON cr.user_mobile = u.mobile
            JOIN data d ON cr.data_id = d.id
            LEFT JOIN ai_response ar ON d.id = ar.data_id
            LEFT JOIN doctor_responses dr ON cr.id = dr.consultation_id
            WHERE cr.doctor_id = ? AND cr.status = 'completed'
            ORDER BY cr.created_at DESC
        `;
        const [rows] = await pool.execute(query, [doctorId]);
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to fetch patients" });
    }
});

// Get Doctor Profile
app.get('/doctor/profile/:id', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT id, name, email, specialization, location, hospital, contact_no, gender FROM doctors WHERE id = ?', [req.params.id]);
        if (rows.length === 0) return res.status(404).json({ error: "Doctor not found" });
        res.json(rows[0]);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});

// Update Doctor Profile
app.put('/doctor/profile/:id', async (req, res) => {
    try {
        const { name, specialization, location, hospital, contact_no, gender } = req.body;
        const query = `UPDATE doctors SET name=?, specialization=?, location=?, hospital=?, contact_no=?, gender=? WHERE id=?`;
        await pool.execute(query, [name, specialization, location, hospital, contact_no, gender, req.params.id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to update profile" });
    }
});

app.post('/consult/request', async (req, res) => {
    try {
        const { user_mobile, data_id } = req.body;
        const query = `INSERT INTO consultation_requests (user_mobile, data_id) VALUES (?, ?)`;
        const [result] = await pool.execute(query, [user_mobile, data_id]);
        
        // Check if doctors are online (simple check)
        // In a real app, we'd check the socket 'doctors' room size more robustly
        // For now, we rely on the socket 'no_doctors_available' event for immediate feedback
        // But we can also send email here if we want to be async
        
        res.json({ success: true, consultationId: result.insertId });
    } catch (error) {
        res.status(500).json({ error: "Request failed" });
    }
});

app.post('/consult/email-admin', async (req, res) => {
    try {
        const { patientDetails, report } = req.body;
        
        const mailOptions = {
            from: process.env.SENDER_EMAIL,
            to: process.env.ADMIN_EMAIL, // Send to admin
            subject: 'Missed Consultation Request',
            text: `A patient requested consultation but no doctors were available.\n\nPatient: ${JSON.stringify(patientDetails)}\n\nReport: ${report}`
        };

        await transporter.sendMail(mailOptions);
        res.json({ success: true });
    } catch (error) {
        console.error("Email error:", error);
        res.status(500).json({ error: "Failed to send email" });
    }
});

app.post('/doctor/response', async (req, res) => {
    try {
        const { consultation_id, doctor_notes, prescription } = req.body;
        const query = `INSERT INTO doctor_responses (consultation_id, doctor_notes, prescription) VALUES (?, ?, ?)`;
        await pool.execute(query, [consultation_id, doctor_notes, prescription]);
        
        // Update request status
        await pool.execute('UPDATE consultation_requests SET status = "completed" WHERE id = ?', [consultation_id]);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Failed to save response" });
    }
});
