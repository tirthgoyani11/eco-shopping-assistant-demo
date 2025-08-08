const fetch = require("node-fetch");

exports.handler = async function(event) {
    // Standard boilerplate for Netlify functions
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
        if (!GEMINI_KEY) {
            console.error("CRITICAL: GEMINI_API_KEY environment variable not found!");
            throw new Error("API key is not configured on the server.");
        }

        // --- NEW EXPERT-LEVEL PROMPTS ---
        let systemInstructions = '';
        if (category === 'eco') {
            systemInstructions = `
                You are an expert Eco-Friendly product analyst for the Indian market.
                - Your analysis must cover the full lifecycle: raw materials, manufacturing impact, and end-of-life (e.g., biodegradability, recyclability).
                - Recommendations must be from Indian e-commerce sites (Flipkart, Amazon.in, etc.).
            `;
        } else if (category === 'food') {
            systemInstructions = `
                You are an expert Health Food analyst and nutritionist for the Indian market.
                - Your analysis MUST detect and mention specific negative attributes like high added sugars, preservatives (e.g., nitrates, BHA), artificial colors, and high processing levels.
                - You MUST also detect and mention positive attributes like 'high-fiber', 'whole grain', 'organic', 'rich in protein'.
                - Recommendations must be from Indian grocery sites (BigBasket, Blinkit, etc.).
            `;
        } else if (category === 'cosmetic') {
            systemInstructions = `
                You are an expert Clean Cosmetics analyst for the Indian market.
                - Your analysis MUST screen for and mention common harmful chemicals like parabens, sulfates (SLS/SLES), and phthalates.
                - You MUST also identify and praise beneficial properties like 'vegan', 'cruelty-free', 'dermatologically tested', or 'certified organic'.
                - Recommendations must be from Indian beauty sites (Nykaa, Myntra, etc.).
            `;
        }

        const prompt = `
            ${systemInstructions}

            **Task:** Perform an expert analysis of the user's product based on your specialized role. Find a representative image for the user's product and for each of your recommendations. For each recommendation, generate a reliable link (prioritize direct product links, but use a Google search link as a fallback). Return a single, clean JSON object.

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "productName": "User's Product Name",
              "productImage": "A valid, direct URL to a high-quality image of the user's product.",
              "isRecommended": false,
              "verdict": "A short, clear verdict based on your expert analysis.",
              "summary": "A detailed analysis in Markdown, mentioning the specific positive or negative attributes you detected.",
              "recommendations": {
                "title": "A relevant title for the recommendations.",
                "items": [
                  {
                    "name": "Recommended Product 1",
                    "description": "A short, compelling description highlighting its key benefits.",
                    "image": "A valid, direct URL to a high-quality image of the recommendation.",
                    "link": "A valid, working URL to the product page OR a Google search link."
                  }
                ]
              }
            }
            \`\`\`

            --- USER INPUT ---
            Title: ${title}
            Description: ${description || "No description provided"}
        `;

        const modelToUse = "gemini-1.5-flash-latest";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                 safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
                ],
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Gemini API Error: ${errorData.error.message}`);
        }

        const data = await response.json();

        // Bulletproof Parsing Logic
        try {
            const rawText = data.candidates[0].content.parts[0].text;
            const jsonResponse = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
            return {
                statusCode: 200,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(jsonResponse)
            };
        } catch (parsingError) {
            console.error("JSON parsing failed. AI returned malformed text.");
            throw new Error("The AI returned a response in an unexpected format. Please try again.");
        }

    } catch (e) {
        console.error("--- FATAL ERROR IN FUNCTION ---", e.message);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "An internal server error occurred: " + e.message })
        };
    }
};
