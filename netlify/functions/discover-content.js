/**
 * Netlify Function: discover-content.js (v3 - AI Discovery Engine)
 * -----------------------------------------------------------------
 * This definitive version uses a two-stage AI process:
 * 1. An AI Trend Spotter identifies current sustainable product categories.
 * 2. The Master Scout Bot finds the best specific products within those trends.
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

// --- The Advanced "Master Scout Bot" (reused from gemini-proxy) ---
async function masterScoutBot(productName, serperApiKey, geminiApiKey) {
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
    try {
        const imageResponse = await axios.post('https://google.serper.dev/images', { q: `${productName} product photo`, gl: 'in' }, { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } });
        const imageUrl = imageResponse.data.images.find(img => img.imageUrl)?.imageUrl || `https://placehold.co/600x400/334155/white?text=${encodeURIComponent(productName)}`;
        const linkGenPrompt = `Generate a compelling description and a relevant Amazon search link for: "${productName}". **JSON Output (MUST follow this exactly):** \`\`\`json { "description": "Your short description with emojis.", "amazon_link": "Your generated Amazon search URL." } \`\`\``;
        const aiResponseText = await generateAiText(linkGenPrompt, geminiApiKey);
        const aiResult = JSON.parse(aiResponseText.replace(/```json/g, "").replace(/```g, "").trim());
        return { name: productName, image: imageUrl, link: aiResult.amazon_link, description: aiResult.description };
    } catch (error) {
        console.error(`Scout Bot Layer 2/3 failed for "${productName}".`);
        return { name: productName, image: `https://placehold.co/600x400/334155/white?text=Not+Found`, link: `https://www.google.com/search?q=${encodeURIComponent(productName)}`, description: "A popular sustainable alternative. Click to explore." };
    }
}


// --- Main Handler ---
exports.handler = async function(event, context) {
    const { GEMINI_API_KEY, SERPER_API_KEY } = process.env;
    if (!SERPER_API_KEY || !GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "API keys are not configured." }) };
    }

    try {
        // --- Step 1: AI Trend Spotter ---
        const trendSpotterPrompt = `
            You are an AI market trend analyst for India. Your task is to identify 6 current and popular trending categories of sustainable, eco-friendly, or conscious consumer products.
            Provide unique and interesting categories, not just generic ones.

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "trending_categories": [
                { "category": "Upcycled Home Decor", "example_product": "Handmade rug from recycled fabrics" },
                { "category": "Zero-Waste Dental Care", "example_product": "Natural toothpaste tablets" },
                { "category": "Cruelty-Free Vegan Skincare", "example_product": "Plant-based face serum" },
                { "category": "Sustainable Kitchen Storage", "example_product": "Beeswax food wraps" },
                { "category": "Artisanal Indian Crafts", "example_product": "Block-print cotton scarf" },
                { "category": "Solar-Powered Gadgets", "example_product": "Solar power bank for phones" }
              ]
            }
            \`\`\`
        `;
        const trendResponseText = await generateAiText(trendSpotterPrompt, GEMINI_API_KEY);
        const { trending_categories } = JSON.parse(trendResponseText.replace(/```json/g, "").replace(/```g, "").trim());

        // --- Step 2: Deploy Master Scout Bot for each trending category ---
        const productPromises = trending_categories.map(cat => 
            masterScoutBot(cat.example_product, SERPER_API_KEY, GEMINI_API_KEY).then(productData => ({
                ...productData,
                // Add the category tag for filtering on the frontend
                tags: [cat.category] 
            }))
        );

        const allProducts = await Promise.all(productPromises);

        // --- Step 3: Curate and Assemble Final Data ---
        const discoverData = {
            // Feature the first trending product as the "Editor's Pick"
            editorsPicks: [allProducts[0]],
            // The rest of the products for the main grid
            products: allProducts
        };

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
