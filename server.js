const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const mysql = require('mysql2/promise');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

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
                   a.response_text 
            FROM data d 
            LEFT JOIN ai_response a ON d.id = a.data_id 
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

        res.json({ result: text });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: "Failed to analyze symptoms." });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
