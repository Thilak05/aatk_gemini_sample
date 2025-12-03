-- Run these commands one by one. If a column exists, it will fail safely.

ALTER TABLE doctors ADD COLUMN location VARCHAR(255);
ALTER TABLE doctors ADD COLUMN hospital VARCHAR(255);
ALTER TABLE doctors ADD COLUMN contact_no VARCHAR(20);
ALTER TABLE doctors ADD COLUMN gender VARCHAR(10);

-- For consultation_requests
ALTER TABLE consultation_requests ADD COLUMN doctor_id INT;
ALTER TABLE consultation_requests ADD COLUMN status ENUM('pending', 'accepted', 'completed', 'expired') DEFAULT 'pending';

-- Add Foreign Key (Only run if it doesn't exist)
ALTER TABLE consultation_requests ADD FOREIGN KEY (doctor_id) REFERENCES doctors(id);

-- Create table (This syntax IS supported)
CREATE TABLE IF NOT EXISTS doctor_responses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    consultation_id INT,
    doctor_notes TEXT,
    prescription TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (consultation_id) REFERENCES consultation_requests(id)
);
