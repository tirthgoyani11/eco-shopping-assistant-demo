const fetch = require("node-fetch");
const { getScoutPrompt } = require("./ai-prompts");

// The Verifier: Checks if a URL is live and accessible.
async function verifyLink(url) {
    if (!url || !url.startsWith('http')) return false;
    try {
        // Use a HEAD request for speed and set a timeout.
        const response = await fetch(url, { method: 'HEAD', timeout: 3500 });
        return response.ok; // status 200-299
    } catch (error) {
        console.warn(`Link verification failed for ${url}:`, error.message);
        return false;
    }
}

// The Scout: Finds one product with both a specific and a category link.
async function findProduct(keyword, apiKey) {
    console.log(`Scout Mission: Finding product for keyword - "${keyword}"`);
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

module.exports = { findProduct, verifyLink };
