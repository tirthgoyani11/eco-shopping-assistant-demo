const fetch = require("node-fetch");

exports.handler = async function(event) {
    // 1. Standard Pre-flight and Method Checks
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
        const { title, description, imageBase64 } = body;

        if (!title && !description && !imageBase64) {
            return { statusCode: 400, body: JSON.stringify({ error: "Please provide a product title, description, or image." }) };
        }

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("API key not configured on the server.");

        let modelToUse;
        const promptParts = [];

        // --- This is the new intelligent logic ---
        if (imageBase64) {
            // If there's an image, use the vision model
            modelToUse = "gemini-pro-vision";
            promptParts.push(
                { text: `As an eco-analyst, analyze the product in this image. Title: "${title || 'N/A'}". Description: "${description || 'N/A'}". Provide a detailed sustainability analysis.` },
                { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }
            );
        } else {
            // If it's only text, use the text model you specified
            modelToUse = "gemini-2.0-flash";
            const textPrompt = `
                You are "Eco Jinner," an expert sustainability analyst. Your goal is to provide a comprehensive, actionable analysis of a product based on user input.

                Follow these steps precisely:

                1.  **Initial Analysis:** Briefly analyze the product's sustainability based on its title and description.
                2.  **Eco-Friendliness Verdict:** State clearly whether the product is "Eco-Friendly" or "Not Eco-Friendly".
                3.  **Recommendations:** If not eco-friendly, suggest 2-3 alternatives with real shopping links. If it is eco-friendly, provide 2-3 links to buy similar items. If it's a simple item, provide a DIY guide.
                4.  **Formatting:** Use Markdown (headings, bold, lists).

                --- USER INPUT ---
                Title: ${title}
                Description: ${description || "No description provided"}
            `;
            promptParts.push({ text: textPrompt });
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GEMINI_KEY}`;

        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: promptParts }] })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            throw new Error(`Gemini API responded with status: ${response.status}`);
        }

        const data = await response.json();

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ result: JSON.stringify(data, null, 2) }) // Keep this structure
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
