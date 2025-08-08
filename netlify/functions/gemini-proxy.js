const fetch = require("node-fetch");

// This function will be our "Scout". It takes a single keyword and finds one product.
async function findProduct(keyword, categoryInstructions, apiKey) {
    console.log(`Scout Mission: Finding product for keyword - "${keyword}"`);
    const scoutPrompt = `
        You are an expert Indian market product scout. Your only mission is to find one single, top-rated, and relevant product based on the keyword provided.

        **Instructions:**
        1.  Search for a product matching the keyword on a major Indian e-commerce site (Amazon.in, Flipkart, Myntra, Nykaa, BigBasket, etc.).
        2.  Return a single, clean JSON object with no other text.

        **JSON Output Structure:**
        \`\`\`json
        {
          "name": "The exact product name",
          "description": "A short, compelling description of this specific product.",
          "image": "A direct, high-quality JPG or PNG image URL for the product.",
          "link": "A direct, working URL to the product page."
        }
        \`\`\`

        --- SCOUT'S TARGET ---
        Keyword: "${keyword}"
    `;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: scoutPrompt }] }] })
        }
    );

    if (!response.ok) {
        console.error(`Scout mission failed for keyword: "${keyword}"`);
        return null; // Return null if this specific search fails
    }

    const data = await response.json();
    try {
        const rawText = data.candidates[0].content.parts[0].text;
        return JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch (e) {
        console.error(`Scout could not parse JSON for keyword: "${keyword}"`, e);
        return null; // Return null if parsing fails
    }
}


exports.handler = async function(event) {
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" } };
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

        // --- Step 1: The Analyst ---
        console.log("Analyst Mission: Analyzing user product.");
        const analystPrompt = `
            You are a senior product analyst. Your first job is to analyze the user's product and create a research plan for your team of scouts.

            **Analysis Instructions:**
            1.  Find a high-quality, representative image URL for the user's product.
            2.  Determine if the product is recommended based on its category.
            3.  Write a detailed summary of your findings in Markdown.
            4.  Based on the category, determine a title for the recommendations section.
            5.  Provide a JSON array of 3 specific, generic keywords for your scouts to search for. These should be alternative product types.

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "productName": "User's Product Name",
              "productImage": "https://example.com/image_of_users_product.jpg",
              "isRecommended": false,
              "verdict": "A short, clear verdict.",
              "summary": "A detailed analysis in Markdown format.",
              "recommendationsTitle": "Better, Eco-Friendly Alternatives",
              "scoutKeywords": ["Stainless Steel Water Bottle", "Glass Water Bottle", "Copper Water Bottle"]
            }
            \`\`\`

            --- USER INPUT ---
            Category: ${category}
            Title: ${title}
            Description: ${description || "No description provided"}
        `;

        const analystResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contents: [{ parts: [{ text: analystPrompt }] }] })
            }
        );

        if (!analystResponse.ok) throw new Error("The initial analysis by the AI failed.");

        const analystData = await analystResponse.json();
        const analystResult = JSON.parse(analystData.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim());

        // --- Step 2: The Scouts ---
        const scoutKeywords = analystResult.scoutKeywords || [];
        // Run all scout missions in parallel for maximum speed
        const scoutPromises = scoutKeywords.map(keyword => findProduct(keyword, "", GEMINI_KEY));
        const scoutResults = (await Promise.all(scoutPromises)).filter(Boolean); // Filter out any null/failed results

        // --- Step 3: Final Assembly ---
        const finalResponse = {
            productName: analystResult.productName,
            productImage: analystResult.productImage,
            isRecommended: analystResult.isRecommended,
            verdict: analystResult.verdict,
            summary: analystResult.summary,
            recommendations: {
                title: analystResult.recommendationsTitle,
                items: scoutResults
            }
        };

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(finalResponse)
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
