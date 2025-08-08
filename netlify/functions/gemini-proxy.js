const fetch = require("node-fetch");

exports.handler = async function(event) {
    // 1. Standard Pre-flight and Method Checks
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: "",
        };
    }

    if (event.httpMethod !== "POST") {
        return {
            statusCode: 405,
            body: "Method Not Allowed",
            headers: { "Access-Control-Allow-Origin": "*" },
        };
    }

    try {
        // 2. Parse Input and Log
        console.log("Function invoked. Parsing request body...");
        const body = JSON.parse(event.body || "{}");
        const { title, description } = body;

        if (!title && !description) {
            console.log("Validation failed: Title and description are missing.");
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Please provide a product title or description." }),
            };
        }
        console.log("Input received:", { title, description });

        // 3. Construct the Prompt
        const simplifiedPrompt = `
            As an eco-analyst, analyze the following product.
            - Product: "${title}"
            - Description: "${description || 'Not provided'}"

            1.  Is it eco-friendly? (Yes/No)
            2.  Briefly explain why.
            3.  Suggest ONE eco-friendly alternative product type.
        `;
        console.log("Constructed prompt for AI.");

        // 4. Securely Call the Gemini API with the CORRECT model
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) {
            console.error("CRITICAL: GEMINI_API_KEY environment variable not found!");
            throw new Error("API key is not configured on the server.");
        }
        console.log("API Key found. Preparing to call Gemini API...");

        // --- Using the model you specified ---
        const modelToUse = "gemini-2.0-flash"; 
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GEMINI_KEY}`;
        
        console.log(`Sending request to: ${apiUrl.split('?')[0]}`); // Log URL without key

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: simplifiedPrompt }]
                }]
            })
        });

        console.log(`Received response from Gemini with status: ${response.status}`);

        // This is the most important part for debugging
        if (!response.ok) {
            const errorData = await response.json();
            // This will print the EXACT error from Google to your Netlify logs
            console.error("Gemini API Error Response:", JSON.stringify(errorData, null, 2));
            throw new Error(`Gemini API responded with status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Successfully received and parsed data from Gemini.");

        // 5. Return the Response to the Frontend
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ result: JSON.stringify(data, null, 2) })
        };

    } catch (e) {
        console.error("FATAL BACKEND ERROR:", e);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                result: JSON.stringify({
                    error: {
                        message: "An internal server error occurred: " + e.message
                    }
                })
            })
        };
    }
};
