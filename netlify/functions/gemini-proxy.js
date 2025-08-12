// This is a Node.js file, so we use 'require' for packages.
const fetch = require('node-fetch');

// This is the main handler for the Netlify serverless function.
exports.handler = async function(event) {
    // We only want to accept POST requests.
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // Get the image data sent from the app.
        const { image } = JSON.parse(event.body);
        if (!image) {
            return { statusCode: 400, body: JSON.stringify({ error: "Image data is required." }) };
        }

        // Securely get your Gemini API key from Netlify's environment variables.
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("GEMINI_API_KEY is not set in Netlify environment variables.");
            return { statusCode: 500, body: JSON.stringify({ error: "API key is not configured on the server." }) };
        }
        
        // Construct the URL for the gemini-2.0-flash model.
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview:generateContent?key=${apiKey}`;

        // The detailed prompt for the SCOUT Bot.
        const prompt = `Execute the 10-layer SCOUT bot algorithm.
1.  **Scan & Specify:** Analyze the image to identify the product's name, brand, and key attributes.
2.  **Categorize & Compare:** First, determine if the product is 'Food' or 'Non-Food'.
3.  **Optimize & Order:** Find ONE best alternative. If 'Food', find a healthier alternative. If 'Non-Food', find a low-carbon alternative.
4.  **Identify Alternative Type:** Classify this best alternative as 'Commercial Product' or 'Home-made Remedy/DIY'.
5.  **Uncover & Link (Commercial):** If commercial, attempt to find a specific, direct product purchase link on Amazon.in.
6.  **Navigate & Search (Fallback):** If no direct link, provide a 'search_query' for Google Shopping.
7.  **Generate & Instruct (Recipe/DIY):** If it's a home-made remedy or DIY, provide a short 'recipe' (for food) or 'diy_instructions' (for non-food) as an array of strings.
8.  **Generalize & Guide:** ALWAYS provide a second, separate 'general_alternative' which is a non-purchase, lifestyle suggestion.
9.  **Verify & Validate:** Ensure all outputs are logical and relevant.
10. **Transmit & Tell:** Return a single JSON object with the results.`;
        
        const responseSchema = { type: "OBJECT", properties: { "name": { "type": "STRING" }, "brand": { "type": "STRING" }, "product_category": { "type": "STRING", "enum": ["Food", "Non-Food"] }, "ecoScore": { "type": "STRING" }, "carbonFootprint": { "type": "NUMBER" }, "health_analysis": { "type": "OBJECT", "properties": { "rating": { "type": "STRING" }, "health_concern": { "type": "STRING" }, "sufficient_intake": { "type": "STRING" } } }, "alternatives": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "name": { "type": "STRING" }, "reason": { "type": "STRING" }, "link": { "type": "STRING" }, "search_query": { "type": "STRING" }, "recipe": { "type": "ARRAY", "items": { "type": "STRING" } }, "diy_instructions": { "type": "ARRAY", "items": { "type": "STRING" } } } } } }, required: ["name", "brand", "product_category"] };

        const payload = { 
            contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: image } }] }], 
            generationConfig: { responseMimeType: "application/json", responseSchema: responseSchema } 
        };

        // Call the Gemini API.
        const geminiResponse = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!geminiResponse.ok) {
            const errorBody = await geminiResponse.text();
            console.error("Gemini API Error:", errorBody);
            throw new Error(`Gemini API call failed with status: ${geminiResponse.status}`);
        }

        const result = await geminiResponse.json();

        if (result.candidates && result.candidates.length > 0) {
            const productData = JSON.parse(result.candidates[0].content.parts[0].text);
            // Send the successful result back to the frontend app.
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify(productData)
            };
        } else {
            throw new Error("No valid response from Gemini.");
        }

    } catch (error) {
        console.error("Netlify Function Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "An internal server error occurred in the Netlify function." })
        };
    }
};
