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
        return {
            statusCode: 405,
            body: "Method Not Allowed",
            headers: { "Access-Control-Allow-Origin": "*" },
        };
    }

    try {
        // 2. Parse Input from Frontend
        const body = JSON.parse(event.body || "{}");
        const { title, description } = body;

        if (!title && !description) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ error: "Please provide a product title or description." }),
            };
        }

        // 3. Construct the Advanced AI Prompt
        const userInput = `Title: ${title}\nDescription: ${description || "No description provided"}`;

        const systemPrompt = `
            You are "Eco Jinner," an expert sustainability analyst. Your goal is to provide a comprehensive, actionable analysis of a product based on user input.

            Follow these steps precisely:

            1.  **Initial Analysis:** Briefly analyze the product's sustainability based on its title and description. Mention its materials, potential manufacturing impact, and end-of-life considerations.

            2.  **Eco-Friendliness Verdict:** State clearly whether the product is generally "Eco-Friendly" or "Not Eco-Friendly".

            3.  **Actionable Recommendations (This is the most important part):**
                * **If the product is NOT Eco-Friendly:**
                    * Provide a section titled "### 🌍 Eco-Friendly Alternatives".
                    * Suggest 2-3 specific types of alternative products. For each alternative, find and include a real, direct shopping link from a major e-commerce site (like Amazon, Etsy, EarthHero, etc.).
                * **If the product IS Eco-Friendly:**
                    * Provide a section titled "### 🛒 Where to Find Similar Products".
                    * Find and include 2-3 real, direct shopping links to similar, highly-rated eco-friendly products on major e-commerce sites.
                * **If you cannot find any shopping links OR the item is simple:**
                    * Provide a section titled "### 🔨 DIY At-Home Alternative".
                    * Briefly outline the steps to make a similar item at home and list the necessary materials.

            4.  **Formatting:** Use Markdown for clear formatting (headings, bold text, and bullet points). Ensure all links are functional.
        `;

        const fullPrompt = `${systemPrompt}\n\n--- USER INPUT ---\n${userInput}`;

        // 4. Securely Call the Gemini API
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) {
            throw new Error("API key is not configured on the server.");
        }

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: fullPrompt }]
                    }]
                })
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            throw new Error(`Gemini API responded with status: ${response.status}`);
        }

        const data = await response.json();

        // 5. Return the Response to the Frontend
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ result: JSON.stringify(data, null, 2) })
        };

    } catch (e) {
        console.error("Backend Error:", e);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({
                result: JSON.stringify({
                    error: {
                        message: "An internal server error occurred: " + e.message
                    }
                })
            })
        };
    }
};
