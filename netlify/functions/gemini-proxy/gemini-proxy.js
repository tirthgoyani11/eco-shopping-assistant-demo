const axios = require("axios");

// --- The Web Scraper Function ---
// This uses the Serper API to get real, live Google search results.
async function getGoogleSearchResult(keyword, apiKey) {
    try {
        const response = await axios.post('https://google.serper.dev/search', {
            q: `${keyword} buy online india -sponsored`,
            gl: 'in', // Geolocation: India
        }, {
            headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' }
        });
        const firstResult = response.data.organic.find(res => res.link);
        if (!firstResult) return null;
        return { name: firstResult.title, link: firstResult.link };
    } catch (error) {
        console.error(`Web scraper failed for keyword: "${keyword}"`);
        return null;
    }
}

// --- The Main Handler ---
exports.handler = async function(event) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const body = JSON.parse(event.body || "{}");
        const { category, title } = body;
        if (!title || !category) return { statusCode: 400, body: JSON.stringify({ error: "Title and category are required." }) };

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        const SERPER_KEY = process.env.SERPER_API_KEY;
        if (!GEMINI_KEY || !SERPER_KEY) throw new Error("API keys are not configured.");

        // --- Step 1: The AI Analyst (Fast Keyword Generation) ---
        const analystPrompt = `
            You are a senior product analyst. Analyze the user's product and create a research plan.
            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "productName": "User's Product Name",
              "productImage": "A valid, direct URL to a high-quality image of the user's product.",
              "isRecommended": false,
              "verdict": "A short, clear verdict.",
              "summary": "A detailed analysis in Markdown format.",
              "recommendationsTitle": "Better, Eco-Friendly Alternatives",
              "scoutKeywords": ["Stainless Steel Water Bottle", "Glass Water Bottle with Silicone Sleeve", "Handmade Copper Water Vessel"]
            }
            \`\`\`
            --- USER INPUT ---
            Category: ${category}
            Title: ${title}
        `;

        const geminiAnalystResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
            { contents: [{ parts: [{ text: analystPrompt }] }] }
        );
        const analystResult = JSON.parse(geminiAnalystResponse.data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim());

        // --- Step 2: The Web Scrapers (Parallel, Fast Search) ---
        const scoutKeywords = analystResult.scoutKeywords || [];
        const searchPromises = scoutKeywords.map(keyword => getGoogleSearchResult(keyword, SERPER_KEY));
        const searchResults = (await Promise.all(searchPromises)).filter(Boolean);

        if (searchResults.length === 0) {
            throw new Error("The web scraper could not find any relevant results for the generated keywords.");
        }

        // --- Step 3: The AI Decorator (Final Polish) ---
        const decoratorPrompt = `
            You are a creative assistant. For each of the following products, find a high-quality image URL and write a short, compelling description.
            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "items": [
                {
                  "name": "Milton Thermosteel Bottle",
                  "description": "Keeps your drinks hot or cold for hours, perfect for daily use.",
                  "image": "https://example.com/image_of_milton_bottle.jpg",
                  "link": "https://www.amazon.in/dp/B07922769T"
                }
              ]
            }
            \`\`\`
            --- PRODUCT LIST TO DECORATE ---
            ${JSON.stringify(searchResults)}
        `;

        const geminiDecoratorResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
            { contents: [{ parts: [{ text: decoratorPrompt }] }] }
        );
        const finalItems = JSON.parse(geminiDecoratorResponse.data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim()).items;

        // --- Final Assembly ---
        const finalResponse = {
            ...analystResult,
            recommendations: {
                title: analystResult.recommendationsTitle,
                items: finalItems,
            },
        };

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(finalResponse),
        };

    } catch (e) {
        console.error("Backend Error:", e.response ? e.response.data : e.message);
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred: " + (e.response ? (e.response.data.error ? e.response.data.error.message : JSON.stringify(e.response.data)) : e.message) }) };
    }
};
