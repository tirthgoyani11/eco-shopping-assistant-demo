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

        // --- NEW, STRICTER PROMPT ---
        let systemInstructions = '';
        if (category === 'eco') {
            systemInstructions = `You are an Eco-Friendly product analyst for the Indian market.`;
        } else if (category === 'food') {
            systemInstructions = `You are a Health Food analyst for the Indian market.`;
        } else if (category === 'cosmetic') {
            systemInstructions = `You are a Safe Cosmetics analyst for the Indian market.`;
        }

        const prompt = `
            ${systemInstructions}

            **Task:** Analyze the user's product. Find a representative image for the user's product and for each recommendation. For each recommendation, you MUST generate a Google search link that is strictly filtered for India and excludes sponsored results. Return a single, clean JSON object.

            **Link Generation Rules (CRITICAL):**
            1.  The "link" field MUST be a valid Google search URL.
            2.  To guarantee the search is for **India only**, you MUST include the parameter "&cr=countryIN" in the URL.
            3.  To **remove sponsored ads**, you MUST add "-sponsored" to the end of the search query (before the country parameter).
            4.  **Correct Example:** "https://www.google.com/search?q=stainless+steel+bottle+-sponsored&cr=countryIN"

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
                    "link": "A valid Google search URL following all the rules above."
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
        
        const jsonResponse = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(jsonResponse)
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
