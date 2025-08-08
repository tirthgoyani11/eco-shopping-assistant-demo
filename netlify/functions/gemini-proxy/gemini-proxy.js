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

        // --- Expert-Level Prompt with Stricter Image Rules ---
        let systemInstructions = '';
        if (category === 'eco') {
            systemInstructions = `You are an expert Eco-Friendly product analyst for the Indian market...`; // Your detailed instructions remain here
        } else if (category === 'food') {
            systemInstructions = `You are an expert Health Food analyst for the Indian market...`; // Your detailed instructions remain here
        } else if (category === 'cosmetic') {
            systemInstructions = `You are an expert Clean Cosmetics analyst for the Indian market...`; // Your detailed instructions remain here
        }

        const prompt = `
            ${systemInstructions}

            **Task:** Perform an expert analysis of the user's product. Find a representative image for the user's product and for each of your recommendations. For each recommendation, generate a reliable link. Return a single, clean JSON object.

            **Image Rules (CRITICAL):**
            1.  The "productImage" and "image" fields MUST be a direct, publicly accessible URL to an image file (ending in .jpg, .png, or .webp).
            2.  DO NOT use temporary or expiring links from e-commerce sites like Amazon. Prioritize stable image URLs.
            3.  If you cannot find a reliable image, you MUST use a placeholder URL from "https://placehold.co/400x400/2c5364/e5e7eb?text=Image+Not+Found".

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "productName": "User's Product Name",
              "productImage": "A valid, direct URL to a high-quality image file.",
              "isRecommended": false,
              "verdict": "A short, clear verdict.",
              "summary": "A detailed analysis in Markdown.",
              "recommendations": {
                "title": "A relevant title for the recommendations.",
                "items": [
                  {
                    "name": "Recommended Product 1",
                    "description": "A short, compelling description.",
                    "image": "A valid, direct URL to a high-quality image file or a placehold.co URL.",
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
            const jsonResponse = JSON.parse(rawText.replace(/```json/g, "").replace(/```g, "").trim());
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
