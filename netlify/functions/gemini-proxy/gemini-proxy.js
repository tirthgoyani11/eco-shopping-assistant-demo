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
        const { category, title, description } = body;

        if (!title || !category) {
            return { statusCode: 400, body: JSON.stringify({ error: "Title and category are required." }) };
        }

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("API key not configured on the server.");

        // --- Refined, Single-Call Prompt ---
        let systemInstructions = '';
        if (category === 'eco') {
            systemInstructions = `You are an Eco-Friendly product analyst for the Indian market. Recommendations must be from Indian e-commerce sites (Flipkart, Amazon.in, etc.).`;
        } else if (category === 'food') {
            systemInstructions = `You are a Health Food analyst for the Indian market. Recommendations must be from Indian grocery sites (BigBasket, Blinkit, etc.).`;
        } else if (category === 'cosmetic') {
            systemInstructions = `You are a Safe Cosmetics analyst for the Indian market. Recommendations must be from Indian beauty sites (Nykaa, Myntra, etc.).`;
        }

        const prompt = `
            ${systemInstructions}

            **Task:** Analyze the user's product. Find a representative image for the user's product and for each of your recommendations. Return a single, clean JSON object. Do not include any text, notes, or markdown formatting outside the final JSON object.

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "productName": "User's Product Name",
              "productImage": "A valid, direct URL to a high-quality image of the user's product.",
              "isRecommended": false,
              "verdict": "A short, clear verdict on the product.",
              "summary": "A detailed analysis in Markdown format.",
              "recommendations": {
                "title": "A relevant title for the recommendations.",
                "items": [
                  {
                    "name": "Recommended Product 1",
                    "description": "A short, compelling description.",
                    "image": "A valid, direct URL to a high-quality image of the recommendation.",
                    "link": "A valid, working URL to the product page."
                  }
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
            throw new Error(`Gemini API Error: ${errorData.error.message}`);
        }

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;

        // --- Bulletproof Parsing Logic ---
        try {
            const jsonResponse = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(jsonResponse)
            };
        } catch (parsingError) {
            // If parsing fails, DO NOT CRASH. Return the raw text as a fallback.
            console.error("JSON parsing failed. AI returned malformed text:", rawText);
            return {
                statusCode: 200, // Still a success, because we got a response.
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({
                    isFallback: true,
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
