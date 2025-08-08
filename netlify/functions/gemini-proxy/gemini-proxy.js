const fetch = require("node-fetch");
// Correctly require the entire module
const aiPrompts = require("./utils/ai-prompts");
const productScout = require("./utils/product-scout");
const affiliateManager = require("./utils/affiliate-manager");

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
        // Use the function from the required module
        const analystPrompt = aiPrompts.getAnalystPrompt(category, title, description);
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
        const scoutPromises = scoutKeywords.map(keyword => productScout.findProduct(keyword, GEMINI_KEY));
        const scoutResults = (await Promise.all(scoutPromises)).filter(Boolean);

        const verifiedItems = await Promise.all(scoutResults.map(async (item) => {
            const isLinkValid = await productScout.verifyLink(item.specificProductLink);
            let finalLink = isLinkValid ? item.specificProductLink : item.categorySearchLink;
            
            finalLink = affiliateManager.addAffiliateTag(finalLink);

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
