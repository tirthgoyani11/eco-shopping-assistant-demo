const fetch = require("node-fetch");

// =================================================================
// UTILS MODULES (Combined into one file to prevent import errors)
// =================================================================

// --- Affiliate Manager Logic ---
const YOUR_AMAZON_TAG = "ecojinner-21"; // Example Amazon India tag
function addAffiliateTag(url) {
    if (!url) return url;
    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes("amazon.in")) {
            urlObj.searchParams.set("tag", YOUR_AMAZON_TAG);
            return urlObj.toString();
        }
        return url;
    } catch (error) {
        return url;
    }
}

// --- AI Prompts Logic ---
function getAnalystPrompt(category, title, description) {
    return `
        You are a senior product analyst. Analyze the user's product and create a research plan for your team of scouts.
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
}

function getScoutPrompt(keyword) {
    return `
        You are an expert Indian market product scout. Your only mission is to find ONE single, top-rated product based on the keyword.
        **Instructions:**
        1. Find a specific product on a major Indian e-commerce site (Amazon.in, Flipkart, etc.).
        2. Provide TWO links: "specificProductLink" and "categorySearchLink" (a fallback).
        **JSON Output Structure:**
        \`\`\`json
        {
          "name": "The exact product name",
          "description": "A short, compelling description.",
          "image": "A direct, high-quality image URL.",
          "specificProductLink": "https://www.amazon.in/dp/B07922769T",
          "categorySearchLink": "https://www.amazon.in/s?k=stainless+steel+bottle"
        }
        \`\`\`
        --- SCOUT'S TARGET ---
        Keyword: "${keyword}"
    `;
}

// --- Product Scout & Verifier Logic ---
async function verifyLink(url) {
    if (!url || !url.startsWith('http')) return false;
    try {
        const response = await fetch(url, { method: 'HEAD', timeout: 3500 });
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function findProduct(keyword, apiKey) {
    const scoutPrompt = getScoutPrompt(keyword);
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: scoutPrompt }] }] })
        }
    );
    if (!response.ok) return null;
    const data = await response.json();
    try {
        const rawText = data.candidates[0].content.parts[0].text;
        return JSON.parse(rawText.replace(/```json/g, "").replace(/```/g, "").trim());
    } catch (e) {
        return null;
    }
}


// =================================================================
// MAIN HANDLER
// =================================================================
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
        if (!title || !category) return { statusCode: 400, body: JSON.stringify({ error: "Title and category are required." }) };

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("API key not configured.");

        // --- Step 1: The Analyst ---
        const analystPrompt = getAnalystPrompt(category, title, description);
        const analystResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: analystPrompt }] }] })
        });
        if (!analystResponse.ok) throw new Error("The initial AI analysis failed.");
        const analystData = await analystResponse.json();
        const analystResult = JSON.parse(analystData.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```/g, "").trim());

        // --- Step 2 & 3: The Scouts & The Verifier ---
        const scoutKeywords = analystResult.scoutKeywords || [];
        const scoutPromises = scoutKeywords.map(keyword => findProduct(keyword, GEMINI_KEY));
        const scoutResults = (await Promise.all(scoutPromises)).filter(Boolean);

        const verifiedItems = await Promise.all(scoutResults.map(async (item) => {
            const isLinkValid = await verifyLink(item.specificProductLink);
            let finalLink = isLinkValid ? item.specificProductLink : item.categorySearchLink;
            finalLink = addAffiliateTag(finalLink);
            return {
                name: item.name,
                description: item.description,
                image: item.image,
                link: finalLink,
            };
        }));

        // --- Final Assembly ---
        const finalResponse = {
            productName: analystResult.productName,
            productImage: analystResult.productImage,
            isRecommended: analystResult.isRecommended,
            verdict: analystResult.verdict,
            summary: analystResult.summary,
            recommendations: {
                title: analystResult.recommendationsTitle,
                items: verifiedItems,
            },
        };

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(finalResponse),
        };

    } catch (e) {
        console.error("Backend Error:", e);
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred: " + e.message }) };
    }
};
