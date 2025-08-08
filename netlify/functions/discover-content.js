/**
 * Netlify Function: discover-content.js (Upgraded)
 * -------------------------------------------------
 * This function now uses the Serper API for images/links and the Gemini API
 * for descriptions to generate dynamic content for the Discover page.
 */

const axios = require("axios");

// --- Helper Function to get a Google Image and Link using Serper ---
async function getProductData(productName, apiKey) {
    try {
        const response = await axios.post('https://google.serper.dev/shopping', {
            q: `${productName} india`,
            gl: 'in', // Geolocation: India
        }, {
            headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' }
        });

        // Find the first valid shopping result
        const firstResult = response.data.shopping.find(item => item.imageUrl && item.link);
        
        if (firstResult) {
            return {
                image: firstResult.imageUrl,
                link: firstResult.link
            };
        }
        // Fallback if no shopping results
        return {
            image: `https://placehold.co/600x400/334155/white?text=${encodeURIComponent(productName)}`,
            link: `https://www.google.com/search?q=${encodeURIComponent(productName)}`
        };

    } catch (error) {
        console.error(`Serper API failed for: "${productName}"`, error.message);
        return {
            image: `https://placehold.co/600x400/334155/white?text=Error`,
            link: `https://www.google.com/search?q=${encodeURIComponent(productName)}`
        };
    }
}

// --- Main Handler ---
exports.handler = async function(event, context) {
    const { SERPER_API_KEY, GEMINI_API_KEY } = process.env;

    if (!SERPER_API_KEY || !GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "API keys are not configured." }) };
    }

    // Base list of products to discover
    const productList = [
        { name: "Handmade Clay Water Bottle", brand: "MittiCool", tags: ["Kitchen", "Made in India", "Plastic-Free"] },
        { name: "Organic Cotton Tote Bag", brand: "EcoBags", tags: ["Fashion", "Organic"] },
        { name: "Bamboo Toothbrush Set", brand: "BrushWithBamboo", tags: ["Personal Care", "Plastic-Free"] },
        { name: "Stainless Steel Reusable Straws", brand: "SteelSip", tags: ["Kitchen", "Plastic-Free"] },
        { name: "Khadi Face Mask", brand: "Gramodyog", tags: ["Personal Care", "Made in India"] },
        { name: "Vegan Leather Wallet", brand: "Arture", tags: ["Fashion", "Vegan"] }
    ];

    try {
        // --- Step 1: Fetch all product data (images, links) in parallel ---
        const productDataPromises = productList.map(p => getProductData(p.name, SERPER_API_KEY));
        const resolvedProductData = await Promise.all(productDataPromises);

        // --- Step 2: Use AI to generate all descriptions in a single batch ---
        const decoratorPrompt = `
            You are a creative marketing assistant for an eco-friendly brand in India.
            For each product name provided below, write a short, compelling, and exciting description (around 15-20 words).
            Use emojis where appropriate. Your tone should be enthusiastic and appeal to a young, conscious audience.

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "descriptions": [
                { "name": "Handmade Clay Water Bottle", "description": "Stay hydrated the traditional way! 💧 This beautiful clay bottle keeps your water naturally cool and pure. #GoPlasticFree" },
                { "name": "Organic Cotton Tote Bag", "description": "Your stylish new best friend for shopping trips! 🛍️ Strong, reusable, and oh-so-good for Mother Earth. #SustainableFashion" }
              ]
            }
            \`\`\`
            --- PRODUCT LIST TO DECORATE ---
            ${JSON.stringify(productList.map(p => ({ name: p.name })))}
        `;

        const geminiResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`,
            { contents: [{ parts: [{ text: decoratorPrompt }] }] }
        );
        const aiDescriptions = JSON.parse(geminiResponse.data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim()).descriptions;

        // --- Step 3: Combine all data into the final product list ---
        const finalProducts = productList.map((product, index) => {
            const aiDesc = aiDescriptions.find(d => d.name === product.name);
            return {
                id: index + 1,
                name: product.name,
                brand: product.brand,
                description: aiDesc ? aiDesc.description : "A great sustainable choice for everyday use.",
                image: resolvedProductData[index].image,
                link: resolvedProductData[index].link, // Added link
                tags: product.tags
            };
        });

        const discoverData = {
            editorsPicks: [finalProducts[0]], // Feature the first product
            products: finalProducts
        };

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(discoverData),
        };

    } catch (error) {
        console.error("Error in discover-content function:", error.response ? error.response.data : error.message);
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred." }) };
    }
};
