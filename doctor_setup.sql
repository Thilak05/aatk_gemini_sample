-- Doctor Table
CREATE TABLE IF NOT EXISTS doctors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    location VARCHAR(255),
    hospital VARCHAR(255),
    contact_no VARCHAR(20),
    gender VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Consultation Requests
CREATE TABLE IF NOT EXISTS consultation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_mobile VARCHAR(20),
    data_id INT,
    status ENUM('pending', 'accepted', 'completed', 'expired') DEFAULT 'pending',
    doctor_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_mobile) REFERENCES users(mobile),
    FOREIGN KEY (data_id) REFERENCES data(id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id)
);

-- Doctor Responses (Notes/Prescriptions)
CREATE TABLE IF NOT EXISTS doctor_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    consultation_id INT,
    doctor_notes TEXT,
    prescription TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES consultation_requests(id)
);
