# AI Symptom Analysis

This is a Node.js application that collects patient vitals and symptoms, and uses the Gemini API to provide a diagnosis and prescription.

## Prerequisites

- Node.js installed
- A Google Gemini API Key

## Setup

1.  Clone the repository or download the files.
2.  Run `npm install` to install dependencies.
3.  Create a `.env` file in the root directory and add your Gemini API key:
    ```
    GEMINI_API_KEY=your_actual_api_key_here
    ```

## Running the Application

1.  Start the server:
    ```bash
    node server.js
    ```
2.  Open your browser and go to `http://localhost:3000`.

## Usage

1.  Enter patient vitals (Height, Gender, Age, etc.).
2.  Select symptoms from the body list.
3.  Click "Submit Symptoms" to get the AI analysis.
