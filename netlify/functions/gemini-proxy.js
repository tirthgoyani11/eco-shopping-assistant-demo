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
            return { statusCode: 400, body: JSON.stringify({ error: "Please provide a product title or description." }) };
        }

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("API key not configured on the server.");

        const prompt = `
            You are "Eco Jinner Pro," a world-class sustainability analyst. Your task is to analyze the provided product information and return a structured JSON object.

            **Analysis Instructions:**
            1.  **Overall Score:** Provide an "overallScore" from 0 to 100, where 100 is perfectly sustainable.
            2.  **Category Scores:** Provide scores (0-100) for three categories: "materials", "manufacturing", and "endOfLife".
            3.  **Verdict:** Provide a short, one-sentence "verdict" (e.g., "Excellent eco-friendly choice," "Poor environmental profile").
            4.  **Summary:** Write a detailed "summary" (2-3 paragraphs) in Markdown explaining your reasoning.
            5.  **Recommendations:**
                * If the score is below 70, provide an "alternatives" array with objects containing a "name" and a real "link".
                * If the score is 70 or above, provide a "shopping" array with objects containing a "name" and a real "link" to buy similar products.
                * If applicable, provide a "diy" object with a "title" and a "steps" array for a DIY alternative.

            **JSON Output Structure (MUST follow this exactly, no extra text or markdown formatting):**
            \`\`\`json
            {
              "overallScore": 85,
              "scores": {
                "materials": 90,
                "manufacturing": 80,
                "endOfLife": 85
              },
              "verdict": "A solid, sustainable option for daily hydration.",
              "summary": "This stainless steel water bottle is an excellent choice...",
              "recommendations": {
                "shopping": [
                  { "name": "Hydro Flask 24oz", "link": "https://www.amazon.com/..." },
                  { "name": "Klean Kanteen Classic", "link": "https://www.kleankanteen.com/..." }
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
        
        // Clean and parse the JSON from the AI's response
        const jsonResponse = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(jsonResponse) // Return the parsed JSON directly
        };

    } catch (e) {
        console.error("Backend Error:", e);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "An internal server error occurred: " + e.message })
        };
    }
};
