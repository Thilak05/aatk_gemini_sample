const express = require('express');
const bodyParser = require('body-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(express.static('public'));
app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/analyze', async (req, res) => {
    try {
        const { vitals, symptoms } = req.body;

        // Construct the prompt
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

        // Use gemini-2.5-flash as requested
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

        res.json({ result: text });

    } catch (error) {
        console.error("Error calling Gemini API:", error);
        res.status(500).json({ error: "Failed to analyze symptoms." });
    }
});

// Export the app for Netlify Functions
module.exports = app;

// Only listen if run directly (not imported)
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });
}
