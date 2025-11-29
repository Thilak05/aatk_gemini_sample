CREATE DATABASE IF NOT EXISTS health_db;
USE health_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    mobile VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    age INT,
    dob VARCHAR(20),
    gender VARCHAR(10),
    address TEXT,
    state VARCHAR(100),
    hidn VARCHAR(50),
    hid VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Health Data Table (Vitals & Symptoms)
CREATE TABLE IF NOT EXISTS data (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_mobile VARCHAR(20),
    height FLOAT,
    weight FLOAT,
    temperature FLOAT,
    spo2 FLOAT,
    heartrate INT,
    symptoms TEXT, -- Storing JSON array or comma-separated string
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_mobile) REFERENCES users(mobile) ON DELETE CASCADE
);

-- AI Response Table
CREATE TABLE IF NOT EXISTS ai_response (
    id INT AUTO_INCREMENT PRIMARY KEY,
    data_id INT,
    response_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (data_id) REFERENCES data(id) ON DELETE CASCADE
);
