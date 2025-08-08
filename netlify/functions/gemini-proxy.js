const fetch = require("node-fetch");

exports.handler = async function(event) {
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
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const body = JSON.parse(event.body || "{}");
        const { title, description } = body;

        if (!title && !description) {
            return { statusCode: 400, body: JSON.stringify({ error: "Input is missing." }) };
        }

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("API key not configured on the server.");

        const prompt = `
            You are "Eco Jinner Pro," a sustainability analyst. Analyze the following product and return a structured JSON object.

            **JSON Output Structure (MUST follow this exactly, no extra text):**
            \`\`\`json
            {
              "overallScore": 85,
              "scores": { "materials": 90, "manufacturing": 80, "endOfLife": 85 },
              "verdict": "A solid, sustainable option.",
              "summary": "This product is a great choice because...",
              "recommendations": {
                "shopping": [ { "name": "Example Product", "link": "https://www.example.com" } ]
              }
            }
            \`\`\`

            --- USER INPUT ---
            Title: ${title}
            Description: ${description || "No description provided"}
        `;

        const modelToUse = "gemini-2.0-flash";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            throw new Error(`Gemini API responded with status: ${response.status}`);
        }

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;

        // --- THIS IS THE NEW BULLETPROOF LOGIC ---
        try {
            // Attempt to parse the cleaned text as JSON
            const jsonResponse = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
            // If successful, return the structured JSON
            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(jsonResponse)
            };
        } catch (parsingError) {
            // If parsing fails, DO NOT CRASH.
            console.error("JSON parsing failed. The AI likely returned malformed text.", parsingError);
            // Return the raw text as a fallback so we can see what went wrong.
            return {
                statusCode: 200, // Still a success, because we got a response from the AI
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    isError: true,
                    fallbackText: `The AI returned a response that could not be structured. Here is the raw text:\n\n---\n\n${rawText}`
                })
            };
        }

    } catch (e) {
        console.error("Backend Error:", e);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "An internal server error occurred: " + e.message })
        };
    }
};
