/**
 * Netlify Function: gemini-proxy.js (v3 - Definitive Scout Bot)
 * -----------------------------------------------------------------
 * This definitive version features a sophisticated, multi-layered "Scout Bot"
 * to find the highest quality product images and links with maximum reliability.
 * It also includes the AI-powered Eco Score calculation and is optimized for a
 * global-first, India-aware user base.
 */

const axios = require("axios");

// --- Helper function for robust Gemini text generation with error handling ---
async function generateAiText(prompt, apiKey) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        // Add a check for valid response structure
        if (response.data && response.data.candidates && response.data.candidates.length > 0) {
            return response.data.candidates[0].content.parts[0].text;
        }
        throw new Error("Invalid response structure from Gemini API.");
    } catch (error) {
        console.error("Gemini API Error:", error.response ? error.response.data : error.message);
        throw new Error("Failed to generate AI content.");
    }
}


// --- The Advanced Product Scout Bot ---
async function productScoutBot(productName, serperApiKey, geminiApiKey) {
    // --- Layer 1: Attempt to get a direct shopping link via Serper Shopping API ---
    try {
        const shoppingResponse = await axios.post('https://google.serper.dev/shopping', 
            { q: `${productName}`, gl: 'in' }, // Prioritize Indian results for relevance
            { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } }
        );
        const shoppingResult = shoppingResponse.data.shopping.find(item => item.imageUrl && item.link);
        if (shoppingResult) {
            const descriptionPrompt = `You are a marketing expert. Write a short, exciting, and compelling description (around 15-20 words) for the product: "${productName}". Use emojis.`;
            const description = await generateAiText(descriptionPrompt, geminiApiKey);
            return {
                name: productName,
                image: shoppingResult.imageUrl,
                link: shoppingResult.link,
                description: description || "A great sustainable choice for everyday use."
            };
        }
    } catch (error) {
        console.warn(`Scout Bot Layer 1 (Shopping API) failed for "${productName}". Moving to Layer 2.`);
    }

    // --- Layer 2: If Shopping fails, use Image Search + AI for a targeted link ---
    try {
        const imageResponse = await axios.post('https://google.serper.dev/images', 
            { q: `${productName} product photo`, gl: 'in' },
            { headers: { 'X-API-KEY': serperApiKey, 'Content-Type': 'application/json' } }
        );
        const imageResult = imageResponse.data.images.find(img => img.imageUrl);
        const imageUrl = imageResult ? imageResult.imageUrl : `https://placehold.co/600x400/334155/white?text=${encodeURIComponent(productName)}`;

        const linkGenPrompt = `
            You are an intelligent shopping assistant. Your task is to generate a compelling product description and a highly relevant Amazon search link for a given product name.

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "description": "Your short, exciting, and compelling description (around 15-20 words) with emojis goes here.",
              "amazon_link": "Your generated Amazon search URL goes here (e.g., https://www.amazon.in/s?k=stainless+steel+bottle)."
            }
            \`\`\`
            --- PRODUCT NAME ---
            "${productName}"
        `;
        const aiResponseText = await generateAiText(linkGenPrompt, geminiApiKey);
        const aiResult = JSON.parse(aiResponseText.replace(/```json/g, "").replace(/```/g, "").trim());

        return {
            name: productName,
            image: imageUrl,
            link: aiResult.amazon_link,
            description: aiResult.description
        };

    } catch (error) {
        console.error(`Scout Bot Layer 2 (Image + AI Link) failed for "${productName}". Moving to Fallback.`);
    }

    // --- Layer 3: Fallback if all else fails ---
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
        const body = JSON.parse(event.body || "{}");
        const { category, title } = body;
        if (!title || !category) return { statusCode: 400, body: JSON.stringify({ error: "Title and category are required." }) };

        const { GEMINI_API_KEY, SERPER_API_KEY } = process.env;
        if (!GEMINI_API_KEY || !SERPER_API_KEY) throw new Error("API keys are not configured.");

        // --- Step 1: The AI Analyst (with Eco Score) ---
        const analystPrompt = `
            You are a senior sustainability analyst for a global market with expertise in India. Your task is to analyze a user's product and provide a comprehensive eco-assessment.

            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "productName": "User's Product Name",
              "isRecommended": false,
              "verdict": "A short, clear verdict.",
              "ecoScore": {
                "score": 25,
                "title": "Poor",
                "justification": "Made from virgin plastic with excessive non-recyclable packaging."
              },
              "summary": "A detailed analysis in Markdown format.",
              "recommendationsTitle": "Better, Eco-Friendly Alternatives",
              "scoutKeywords": ["Stainless Steel Water Bottle", "Glass Water Bottle with Silicone Sleeve", "Handmade Copper Water Vessel"]
            }
            \`\`\`
            --- USER INPUT ---
            Category: ${category}
            Title: ${title}
        `;

        const analystResponseText = await generateAiText(analystPrompt, GEMINI_API_KEY);
        const analystResult = JSON.parse(analystResponseText.replace(/```json/g, "").replace(/```/g, "").trim());

        // --- Step 2: Fetch Main Product Image using the Scout Bot's image logic ---
        const mainProductData = await productScoutBot(analystResult.productName, SERPER_API_KEY, GEMINI_API_KEY);
        const productImage = mainProductData.image;

        // --- Step 3: Run the Scout Bot for all recommendations in parallel ---
        const recommendationPromises = (analystResult.scoutKeywords || []).map(keyword => 
            productScoutBot(keyword, SERPER_API_KEY, GEMINI_API_KEY)
        );
        const finalItems = await Promise.all(recommendationPromises);

        // --- Final Assembly ---
        const finalResponse = {
            ...analystResult,
            productImage: productImage,
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
