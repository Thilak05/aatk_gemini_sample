# AI Health Assistant

A full-stack AI-powered healthcare application that collects patient vitals and symptoms to provide preliminary diagnosis and prescriptions using Google's Gemini API. The app features secure user authentication, medical history tracking, and PDF report generation.

## 🚀 Features

- **User Authentication**: Secure Login/Register via Mobile Number or QR Code.
- **Vitals Tracking**: Collects height, weight, temperature, SpO2, and heart rate.
- **Interactive Symptom Checker**: Body-map style interface for selecting symptoms.
- **AI Diagnosis**: Uses Google Gemini 2.5 Flash to analyze symptoms and suggest diagnoses/medicines.
- **User Profile & History**: View past analyses and medical records.
- **PDF Reports**: Generate and download detailed health reports including vitals and diagnosis history.
- **Responsive Design**: Modern, mobile-friendly UI.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL (Azure Database for MySQL)
- **AI Model**: Google Gemini 2.5 Flash
- **Deployment**: Azure App Service

## 📋 Prerequisites

- Node.js (v18 or higher)
- MySQL Database
- Google Gemini API Key
- Azure Account (for deployment)

## ⚙️ Local Setup

1.  **Clone the repository**
    ```bash
    git clone <repository-url>
    cd ai_symptom
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Database Setup**
    - Create a MySQL database named `health_db`.
    - Run the `database_setup.sql` script to create the necessary tables (`users`, `data`, `ai_response`).

4.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```env
    GEMINI_API_KEY=your_gemini_api_key
    DB_HOST=your_db_host
    DB_USER=your_db_user
    DB_PASSWORD=your_db_password
    DB_NAME=health_db
    ```

5.  **Run the Application**
    ```bash
    npm start
    ```
    Access the app at `http://localhost:3000`.

