/**
 * Netlify Function: discover-content.js (Unbreakable Titan Engine)
 * -----------------------------------------------------------------
 * This definitive version is optimized for maximum resilience and performance.
 * Features: Caching, Retry with Exponential Backoff, and the multi-layered
 * Master Scout Bot to find the best products based on AI-spotted trends.
 */

const axios = require("axios");

// --- In-memory cache to store generated content for a short period ---
const cache = new Map();
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

// --- Helper function to safely extract JSON from AI text response ---
function extractJson(text) {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    if (match && match[1]) {
        try {
            return JSON.parse(match[1]);
        } catch (e) {
            console.error("Failed to parse extracted JSON:", e);
        }
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse raw text as JSON:", text);
        throw new Error("AI returned data in an unexpected format.");
    }
}

// --- AI Helper Functions with Retry Mechanism ---
async function makeRequestWithRetry(requestFn, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await requestFn();
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            const delay = Math.pow(2, i) * 1000; // Exponential backoff
            console.warn(`Request failed. Retrying in ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
        }
    }
}

async function generateAiText(prompt, apiKey) {
    return makeRequestWithRetry(async () => {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            return response.data.candidates[0].content.parts[0].text;
        }
        throw new Error("Invalid response structure from Gemini API.");
    });
}

// --- The Advanced "Master Scout Bot" (reused and optimized) ---
async function masterScoutBot(productName, serperApiKey, geminiApiKey) {
    return makeRequestWithRetry(async () => {
        // Layer 1: Price Comparison Scout
        try {
            const shoppingResponse = await axios.post('https://google.serper.dev/shopping', { q: `${productName}`, gl: 'in' }, { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } });
            const resultsWithPrices = shoppingResponse.data.shopping.filter(item => item.price && item.link && item.imageUrl);
            if (resultsWithPrices.length > 0) {
                const bestPricedItem = resultsWithPrices.reduce((min, item) => (parseFloat(item.price.replace(/[^0-9.-]+/g,"")) < parseFloat(min.price.replace(/[^0-9.-]+/g,""))) ? item : min);
                const descriptionPrompt = `Write a short, exciting description (around 15 words) for "${productName}". Use emojis.`;
                const description = await generateAiText(descriptionPrompt, geminiApiKey);
                return { name: productName, image: bestPricedItem.imageUrl, link: bestPricedItem.link, description: description || "A great sustainable choice." };
            }
        } catch (error) { console.warn(`Scout Bot Layer 1 failed for "${productName}".`); }

        // Layer 2 & 3: AI-Powered Amazon Scout & Fallback
        const imageResponse = await axios.post('https://google.serper.dev/images', { q: `${productName} product photo`, gl: 'in' }, { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } });
        const imageUrl = imageResponse.data.images.find(img => img.imageUrl)?.imageUrl || `https://placehold.co/600x400/334155/white?text=${encodeURIComponent(productName)}`;
        const linkGenPrompt = `Generate a compelling description and a relevant Amazon search link for: "${productName}". **JSON Output (MUST follow this exactly):** \`\`\`json { "description": "Your short description with emojis.", "amazon_link": "Your generated Amazon search URL." } \`\`\``;
        const aiResponseText = await generateAiText(linkGenPrompt, geminiApiKey);
        const aiResult = extractJson(aiResponseText);
        return { name: productName, image: imageUrl, link: aiResult.amazon_link, description: aiResult.description };
    });
}

// --- Main Handler ---
exports.handler = async function(event, context) {
    const { GEMINI_API_KEY, SERPER_API_KEY } = process.env;
    if (!GEMINI_API_KEY || !SERPER_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "API keys are not configured." }) };
    }

    const cacheKey = 'discover-content';

    // Check cache first
    if (cache.has(cacheKey) && (Date.now() - cache.get(cacheKey).timestamp < CACHE_DURATION_MS)) {
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(cache.get(cacheKey).data),
        };
    }

    try {
        // --- Step 1: AI Trend Spotter ---
        const trendSpotterPrompt = `You are an AI market trend analyst for India. Identify 6 current and popular trending categories of sustainable, eco-friendly products. Provide unique and interesting categories. **JSON Output (MUST follow this exactly):** \`\`\`json { "trending_categories": [ { "category": "Upcycled Home Decor", "example_product": "Handmade rug from recycled fabrics" }, { "category": "Zero-Waste Dental Care", "example_product": "Natural toothpaste tablets" }, { "category": "Cruelty-Free Vegan Skincare", "example_product": "Plant-based face serum" }, { "category": "Sustainable Kitchen Storage", "example_product": "Beeswax food wraps" }, { "category": "Artisanal Indian Crafts", "example_product": "Block-print cotton scarf" }, { "category": "Solar-Powered Gadgets", "example_product": "Solar power bank for phones" } ] } \`\`\``;
        const trendResponseText = await generateAiText(trendSpotterPrompt, GEMINI_API_KEY);
        const { trending_categories } = extractJson(trendResponseText);

        // --- Step 2: Deploy Master Scout Bot for each trending category ---
        const productPromises = trending_categories.map(cat => 
            masterScoutBot(cat.example_product, SERPER_API_KEY, GEMINI_API_KEY).then(productData => ({
                ...productData,
                tags: [cat.category] 
            }))
        );
        const allProducts = await Promise.all(productPromises);

        // --- Step 3: Curate and Assemble Final Data ---
        const discoverData = {
            editorsPicks: [allProducts[0]],
            products: allProducts
        };

        // Store successful response in cache
        cache.set(cacheKey, { timestamp: Date.now(), data: discoverData });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(discoverData),
        };

    } catch (error) {
        console.error("Error in AI Discovery Engine:", error.message);
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred while discovering products." }) };
    }
};
