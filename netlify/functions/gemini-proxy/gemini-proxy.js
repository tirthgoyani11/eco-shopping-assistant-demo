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

        // --- Optimized Single-Call Prompt ---
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

            **Task:** Analyze the user's product. Find a representative image for the user's product and for each of your recommendations. For each recommendation, you MUST generate a reliable link. Prioritize direct product links, but if you cannot find one, use a Google search link as a fallback. Return a single, clean JSON object.

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

        const modelToUse = "gemini-1.5-flash-latest"; // A fast and capable model
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                 safetySettings: [ // Prevents the AI from blocking its own response
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

        // --- Bulletproof Parsing Logic ---
        // This prevents the function from crashing if the AI response is messy.
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
            // Return a clean error message to the frontend instead of crashing.
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
