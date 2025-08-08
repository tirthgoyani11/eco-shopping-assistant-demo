const fetch = require("node-fetch");

exports.handler = async function(event) {
    // Standard pre-flight check for browser compatibility
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
    // Ensure the request is a POST request
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // Parse the incoming data from the frontend
        const body = JSON.parse(event.body || "{}");
        const { category, title, description } = body;

        // Validate that the required fields are present
        if (!title || !category) {
            return { statusCode: 400, body: JSON.stringify({ error: "Title and category are required." }) };
        }

        // Securely get the API key from Netlify's environment variables
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("API key not configured on the server.");

        // --- Dynamically set the AI's instructions based on the chosen category ---
        let systemInstructions = '';
        if (category === 'eco') {
            systemInstructions = `
                You are an Eco-Friendly product analyst for the Indian market.
                - If the product is not eco-friendly, your recommendations title must be "Better, Eco-Friendly Alternatives". Recommend sustainable alternatives.
                - If the product is eco-friendly, your recommendations title must be "Where to Buy This & Similar Products".
                - For each recommendation, provide a valid shopping link from an Indian e-commerce site (Flipkart, Amazon.in, Amala Earth, etc.).
            `;
        } else if (category === 'food') {
            systemInstructions = `
                You are a Health Food analyst for the Indian market.
                - If the food is unhealthy, your recommendations title must be "Healthier Food Alternatives". Recommend healthy options.
                - If the food is healthy, your recommendations title must be "Where to Buy This Healthy Food".
                - For each recommendation, provide a valid shopping link from an Indian grocery or health food site (BigBasket, Blinkit, Zepto, etc.).
            `;
        } else if (category === 'cosmetic') {
            systemInstructions = `
                You are a Safe Cosmetics analyst for the Indian market.
                - If the cosmetic has harmful ingredients, your recommendations title must be "Safer & Cleaner Alternatives". Recommend products with safe ingredients.
                - If the cosmetic is safe, your recommendations title must be "Where to Buy This Clean Cosmetic".
                - For each recommendation, provide a valid shopping link from an Indian beauty site (Nykaa, Myntra, Purplle, etc.).
            `;
        }

        // --- Construct the final, detailed prompt for the AI ---
        const prompt = `
            ${systemInstructions}

            **Task:** Analyze the user's product. Then, find a representative image for the user's product and for each of your recommendations. Return a single, clean JSON object. Do not include any text, notes, or markdown formatting outside the final JSON object.

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "productName": "User's Product Name",
              "productImage": "https://example.com/image_of_users_product.jpg",
              "isRecommended": false,
              "verdict": "A short, clear verdict on the product.",
              "summary": "A detailed analysis in Markdown format.",
              "recommendations": {
                "title": "The title you generated based on instructions.",
                "items": [
                  {
                    "name": "Recommended Product 1",
                    "description": "A short, compelling description of the alternative.",
                    "image": "https://example.com/image_of_recommendation1.jpg",
                    "link": "https://www.flipkart.com/..."
                  }
                ]
              }
            }
            \`\`\`

            --- USER INPUT ---
            Title: ${title}
            Description: ${description || "No description provided"}
        `;

        // Use the specific model required by your API key
        const modelToUse = "gemini-2.0-flash";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GEMINI_KEY}`;

        // Call the Gemini API
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        // Handle errors from the Gemini API
        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            throw new Error(`Gemini API Error: ${errorData.error.message}`);
        }

        const data = await response.json();
        const rawText = data.candidates[0].content.parts[0].text;
        
        // Clean and parse the JSON from the AI's response
        const jsonResponse = JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());

        // Send the clean JSON back to the frontend
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(jsonResponse)
        };

    } catch (e) {
        // Catch any other errors in the function and return a clear error message
        console.error("Backend Error:", e);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "An internal server error occurred: " + e.message })
        };
    }
};
