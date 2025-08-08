const axios = require("axios");

// --- The Verifier & Scout Functions ---
async function verifyLink(url) {
    if (!url || !url.startsWith('http')) return false;
    try {
        const response = await axios.head(url, { timeout: 3500 });
        return response.status >= 200 && response.status < 400;
    } catch (error) {
        return false;
    }
}

async function findProduct(keyword, apiKey) {
    const scoutPrompt = `You are an expert Indian market product scout... (Your detailed scout prompt here)`;
    // ... (rest of the findProduct function)
    // This function is kept from the previous best version for brevity
    // but would be fully implemented here.
    // For this example, we'll simulate its output.
    return {
        name: `${keyword}`,
        description: `A high-quality ${keyword.toLowerCase()} available in India.`,
        image: `https://placehold.co/400x400/2c5364/e5e7eb?text=${keyword.replace(/\s/g,'+')}`,
        specificProductLink: `https://www.amazon.in/s?k=${keyword.replace(/\s/g,'+')}`,
        categorySearchLink: `https://www.google.com/search?q=${keyword.replace(/\s/g,'+')}`
    };
}


// --- The Main Handler ---
exports.handler = async function(event) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const body = JSON.parse(event.body || "{}");
        const { title } = body;
        if (!title) return { statusCode: 400, body: JSON.stringify({ error: "Title is required." }) };

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("API key not configured.");

        // --- Step 1: The Universal Analyst ---
        const analystPrompt = `
            You are a Universal Product Analyst. Your first job is to analyze the user's product and create TWO distinct research plans: one for "Eco-Friendly" alternatives and one for "Healthy/Clean" alternatives.

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "productName": "User's Product Name",
              "productImage": "A valid, direct URL to a high-quality image of the user's product.",
              "verdict": "A short, clear overall verdict.",
              "summary": "A detailed analysis in Markdown format.",
              "ecoPlan": {
                "title": "Eco-Friendly Alternatives",
                "keywords": ["Sustainable Keyword 1", "Sustainable Keyword 2"]
              },
              "healthPlan": {
                "title": "Healthier & Cleaner Alternatives",
                "keywords": ["Healthy Keyword 1", "Healthy Keyword 2"]
              }
            }
            \`\`\`
            --- USER INPUT ---
            Title: ${title}
        `;

        const analystResponse = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`, {
            contents: [{ parts: [{ text: analystPrompt }] }]
        });
        const analystResult = JSON.parse(analystResponse.data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim());

        // --- Step 2 & 3: Parallel Scouting & Verification ---
        const ecoScoutPromises = (analystResult.ecoPlan.keywords || []).map(keyword => findProduct(keyword, GEMINI_KEY));
        const healthScoutPromises = (analystResult.healthPlan.keywords || []).map(keyword => findProduct(keyword, GEMINI_KEY));

        const ecoScoutResults = (await Promise.all(ecoScoutPromises)).filter(Boolean);
        const healthScoutResults = (await Promise.all(healthScoutPromises)).filter(Boolean);

        const verifiedEcoItems = await Promise.all(ecoScoutResults.map(async (item) => {
            const isLinkValid = await verifyLink(item.specificProductLink);
            return { ...item, link: isLinkValid ? item.specificProductLink : item.categorySearchLink };
        }));
        const verifiedHealthItems = await Promise.all(healthScoutResults.map(async (item) => {
            const isLinkValid = await verifyLink(item.specificProductLink);
            return { ...item, link: isLinkValid ? item.specificProductLink : item.categorySearchLink };
        }));

        // --- Final Assembly ---
        const finalResponse = {
            productName: analystResult.productName,
            productImage: analystResult.productImage,
            verdict: analystResult.verdict,
            summary: analystResult.summary,
            recommendations: [
                { title: analystResult.ecoPlan.title, items: verifiedEcoItems },
                { title: analystResult.healthPlan.title, items: verifiedHealthItems }
            ]
        };

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(finalResponse),
        };

    } catch (e) {
        console.error("Backend Error:", e.response ? e.response.data : e.message);
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
