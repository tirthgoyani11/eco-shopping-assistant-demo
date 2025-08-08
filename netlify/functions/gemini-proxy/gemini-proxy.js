const axios = require("axios");

// --- The Web Scraper Function ---
// This function takes a keyword and uses the Serper API to get real, live Google search results.
async function getGoogleSearchResult(keyword, apiKey) {
    try {
        const response = await axios.post('https://google.serper.dev/search', {
            q: `${keyword} buy online india -sponsored`,
            gl: 'in', // Geolocation: India
        }, {
            headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json'
            }
        });

        // Find the first organic (non-ad) result
        const firstResult = response.data.organic.find(res => res.link);
        if (!firstResult) return null;

        // The AI will generate the image and description later
        return {
            name: firstResult.title,
            link: firstResult.link
        };
    } catch (error) {
        console.error(`Web scraper failed for keyword: "${keyword}"`, error.response ? error.response.data : error.message);
        return null;
    }
}

// --- The Main Handler ---
exports.handler = async function(event) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const body = JSON.parse(event.body || "{}");
        const { category, title, description } = body;
        if (!title || !category) return { statusCode: 400, body: JSON.stringify({ error: "Title and category are required." }) };

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        const SERPER_KEY = process.env.SERPER_API_KEY;
        if (!GEMINI_KEY || !SERPER_KEY) throw new Error("API keys are not configured.");

        // --- Step 1: The AI Analyst ---
        // The AI's only job is to analyze and generate a research plan (keywords).
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
              "scoutKeywords": ["Stainless Steel Water Bottle", "Glass Water Bottle", "Copper Water Bottle"]
            }
            \`\`\`
            --- USER INPUT ---
            Category: ${category}
            Title: ${title}
            Description: ${description || "No description provided"}
        `;

        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
            { contents: [{ parts: [{ text: analystPrompt }] }] }
        );
        
        const analystResult = JSON.parse(geminiResponse.data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim());

        // --- Step 2: The Web Scrapers ---
        // Run all Google searches in parallel for maximum speed.
        const scoutKeywords = analystResult.scoutKeywords || [];
        const searchPromises = scoutKeywords.map(keyword => getGoogleSearchResult(keyword, SERPER_KEY));
        const searchResults = (await Promise.all(searchPromises)).filter(Boolean); // Filter out any failed searches

        // --- Step 3: The AI Decorator (Final Polish) ---
        // A final, quick AI call to add beautiful descriptions and images to our verified links.
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
            --- PRODUCT LIST ---
            ${JSON.stringify(searchResults)}
        `;

        const decoratorResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
            { contents: [{ parts: [{ text: decoratorPrompt }] }] }
        );

        const finalItems = JSON.parse(decoratorResponse.data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim()).items;

        // --- Final Assembly ---
        const finalResponse = {
            ...analystResult, // This includes productName, productImage, verdict, summary, etc.
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
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred: " + (e.response ? e.response.data.error.message : e.message) }) };
    }
};
