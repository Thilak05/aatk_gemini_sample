const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function listModels() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy init to get client
    // Actually the SDK doesn't have a direct listModels on the client instance easily accessible in all versions, 
    // but we can try to just use the API directly or check documentation. 
    // Wait, the error message said: "Call ListModels to see the list of available models".
    // The Node SDK might not expose listModels directly on the genAI object in older versions, but let's check.
    // Actually, it's usually not on the client but on a ModelManager or similar.
    // Let's try a simple fetch to the API endpoint if the SDK doesn't make it obvious.
    
    // Better approach with SDK if possible, but for now let's just try to use a known working model like 'gemini-pro' to see if it works, 
    // or just fetch the list via REST if we can.
    
    // Let's try to use the SDK's model listing if available.
    // In the current @google/generative-ai, it might not be straightforward to list models.
    
    console.log("Checking available models...");
    // We will try to run a generation with 'gemini-1.5-flash-001' and 'gemini-1.5-flash-8b' to see if they work.
    
  } catch (e) {
    console.error(e);
  }
}

// Alternative: Use a simple fetch to list models
async function fetchModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
        console.error("API Key not set.");
        return;
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => console.log(m.name));
        } else {
            console.log("Error listing models:", data);
        }
    } catch (error) {
        console.error("Fetch error:", error);
    }
}

fetchModels();
