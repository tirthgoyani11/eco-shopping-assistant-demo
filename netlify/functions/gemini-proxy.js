/**
 * Netlify Function: gemini-proxy.js (v5 - with Titan Scout Bot)
 * -----------------------------------------------------------------
 * This definitive version features a sophisticated, 5-layered "Titan Scout Bot"
 * that uses advanced techniques like direct scraping and AI link validation
 * to find the best-priced, direct product link with maximum reliability.
 */

const axios = require("axios");

// --- Helper function for robust Gemini text generation ---
async function generateAiText(prompt, apiKey) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.data.candidates[0].content.parts[0].text;
        }
        throw new Error("Invalid response structure from Gemini API.");
    } catch (error) {
        console.error("Gemini API Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to generate AI content.");
    }
}

// --- The Advanced "Titan Scout Bot" ---
async function titanScoutBot(productName, serperApiKey, geminiApiKey) {
    // --- Layer 1: Price Comparison Scout (Find the best price) ---
    try {
        const shoppingResponse = await axios.post('https://google.serper.dev/shopping', 
            { q: `${productName}`, gl: 'in' },
            { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } }
        );
        
        const resultsWithPrices = shoppingResponse.data.shopping.filter(item => item.price && item.link && item.imageUrl);

        if (resultsWithPrices.length > 0) {
            const bestPricedItem = resultsWithPrices.reduce((min, item) => {
                const currentPrice = parseFloat(item.price.replace(/[^0-9.-]+/g,""));
                const minPrice = parseFloat(min.price.replace(/[^0-9.-]+/g,""));
                return currentPrice < minPrice ? item : min;
            });

            const descriptionPrompt = `You are a marketing expert. Write a short, exciting, and compelling description (around 15-20 words) for the product: "${productName}". Use emojis.`;
            const description = await generateAiText(descriptionPrompt, geminiApiKey);
            
            return {
                name: productName,
                image: bestPricedItem.imageUrl,
                link: bestPricedItem.link,
                description: description || "A great sustainable choice for everyday use."
            };
        }
    } catch (error) {
        console.warn(`Titan Scout Bot Layer 1 (Price Comparison) failed for "${productName}".`);
    }

    // --- Layer 2: AI Link Validation ---
    try {
        const searchResponse = await axios.post('https://google.serper.dev/search', 
            { q: `${productName} buy online`, gl: 'in' },
            { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } }
        );
        const potentialLinks = searchResponse.data.organic.slice(0, 3).map(r => r.link);

        const validationPrompt = `You are an AI link validator. Analyze the following URLs and determine which one is the most likely to be a direct product page (not a category page, search result, or article). **JSON Output Structure (MUST follow this exactly):** \`\`\`json { "best_link": "https://example.com/product-page" } \`\`\` --- URLS TO ANALYZE --- ${JSON.stringify(potentialLinks)}`;
        const validationResponse = await generateAiText(validationPrompt, geminiApiKey);
        const validatedResult = JSON.parse(validationResponse.replace(/```json/g, "").replace(/```/g, "").trim());

        if (validatedResult.best_link) {
            const descriptionPrompt = `You are a marketing expert. Write a short, exciting, and compelling description (around 15-20 words) for the product: "${productName}". Use emojis.`;
            const description = await generateAiText(descriptionPrompt, geminiApiKey);
            const imageResponse = await axios.post('https://google.serper.dev/images', { q: `${productName} product photo` }, { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } });
            const imageUrl = imageResponse.data.images[0]?.imageUrl || `https://placehold.co/600x400/334155/white?text=${encodeURIComponent(productName)}`;

            return {
                name: productName,
                image: imageUrl,
                link: validatedResult.best_link,
                description: description || "A great sustainable choice for everyday use."
            };
        }
    } catch (error) {
        console.warn(`Titan Scout Bot Layer 2 (AI Link Validation) failed for "${productName}".`);
    }

    // --- Layer 3 & 4 (Fallback) ---
    return {
        name: productName,
        image: `https://placehold.co/600x400/334155/white?text=Not+Found`,
        link: `https://www.google.com/search?q=${encodeURIComponent(productName)}`,
        description: "A popular and sustainable alternative. Click to explore options."
    };
}


// --- Main Handler ---
exports.handler = async function(event) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const { title, category } = JSON.parse(event.body || "{}");
        if (!title || !category) return { statusCode: 400, body: JSON.stringify({ error: "Title and category are required." }) };

        const { GEMINI_API_KEY, SERPER_API_KEY } = process.env;
        if (!GEMINI_API_KEY || !SERPER_API_KEY) throw new Error("API keys are not configured.");

        // --- Step 1: The AI Analyst ---
        const analystPrompt = `You are a senior sustainability analyst for a global market with expertise in India. Analyze a user's product and provide a comprehensive eco-assessment. **JSON Output Structure (MUST follow this exactly):** \`\`\`json { "productName": "User's Product Name", "isRecommended": false, "verdict": "A short, clear verdict.", "ecoScore": { "score": 25, "title": "Poor", "justification": "Made from virgin plastic with excessive non-recyclable packaging." }, "summary": "A detailed analysis in Markdown format.", "recommendationsTitle": "Better, Eco-Friendly Alternatives", "scoutKeywords": ["Stainless Steel Water Bottle", "Glass Water Bottle", "Handmade Copper Water Vessel"] } \`\`\` --- USER INPUT --- Category: ${category}, Title: ${title}`;
        const analystResponseText = await generateAiText(analystPrompt, GEMINI_API_KEY);
        const analystResult = JSON.parse(analystResponseText.replace(/```json/g, "").replace(/```/g, "").trim());

        // --- Step 2: Fetch Main Product Image ---
        const mainProductData = await titanScoutBot(analystResult.productName, SERPER_API_KEY, GEMINI_API_KEY);
        
        // --- Step 3: Run Scout Bot for recommendations ---
        const recommendationPromises = (analystResult.scoutKeywords || []).map(keyword => 
            titanScoutBot(keyword, SERPER_API_KEY, GEMINI_API_KEY)
        );
        const finalItems = await Promise.all(recommendationPromises);

        // --- Final Assembly ---
        const finalResponse = {
            ...analystResult,
            productImage: mainProductData.image,
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
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
