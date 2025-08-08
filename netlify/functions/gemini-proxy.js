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
        // 2. Parse Input from Frontend
        const body = JSON.parse(event.body || "{}");
        const { title, description } = body;

        if (!title && !description) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Please provide a product title or description." }),
            };
        }

        // 3. Construct a SIMPLIFIED AI Prompt for debugging
        const simplifiedPrompt = `
            As an eco-analyst, analyze the following product.
            - Product: "${title}"
            - Description: "${description || 'Not provided'}"

            1.  Is it eco-friendly? (Yes/No)
            2.  Briefly explain why.
            3.  Suggest ONE eco-friendly alternative product type.
        `;

        // 4. Securely Call the Gemini API
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) {
            throw new Error("API key is not configured on the server.");
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: simplifiedPrompt }]
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            throw new Error(`Gemini API responded with status: ${response.status}`);
        }

        const data = await response.json();

        // 5. Return the Response to the Frontend
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ result: JSON.stringify(data, null, 2) })
        };

    } catch (e) {
        console.error("Backend Error:", e);
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
