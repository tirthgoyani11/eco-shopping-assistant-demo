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

        // --- NEW PROMPT WITH INDIAN E-COMMERCE INSTRUCTIONS ---
        const prompt = `
            You are "Eco Jinner Pro," a sustainability analyst with a focus on the Indian market. Your task is to analyze the provided product information and return a structured JSON object.

            **Analysis Instructions:**
            1.  **Overall Score:** Provide an "overallScore" from 0 to 100.
            2.  **Category Scores:** Provide scores (0-100) for "materials", "manufacturing", and "endOfLife".
            3.  **Verdict:** Provide a short, one-sentence "verdict".
            4.  **Summary:** Write a detailed "summary" in Markdown.
            5.  **Recommendations (IMPORTANT INDIAN FOCUS):**
                * Your primary goal is to provide **working, direct shopping links** from e-commerce sites that are popular in **India** (e.g., **Flipkart, Amazon.in, Myntra, Nykaa, Tata CLiQ, Brown Living, Amala Earth**).
                * Prioritize products from companies that sell directly in India.
                * If the score is below 70, provide an "alternatives" array with objects containing a "name" and a valid "link".
                * If the score is 70 or above, provide a "shopping" array with objects containing a "name" and a valid "link".
                * If applicable, provide a "diy" object with a "title" and "steps" array.

            **JSON Output Structure (MUST follow this exactly, no extra text):**
            \`\`\`json
            {
              "overallScore": 78,
              "scores": { "materials": 80, "manufacturing": 70, "endOfLife": 85 },
              "verdict": "A good sustainable choice available in India.",
              "summary": "This product shows strong eco-credentials...",
              "recommendations": {
                "shopping": [
                  { "name": "Brand X Khadi Shirt", "link": "https://www.flipkart.com/..." },
                  { "name": "Brand Y Jute Bag", "link": "https://www.amazon.in/..." }
                ]
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

        // Bulletproof parsing logic
        try {
            const jsonResponse = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(jsonResponse)
            };
        } catch (parsingError) {
            console.error("JSON parsing failed. AI returned malformed text:", rawText);
            return {
                statusCode: 200,
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
