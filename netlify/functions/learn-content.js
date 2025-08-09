/**
 * Netlify Function: learn-content.js (Unbreakable Titan Engine)
 * -----------------------------------------------------------------
 * This definitive version is optimized for maximum resilience and performance.
 * Features: Caching, Retry with Exponential Backoff, Advanced Validation.
 */

const axios = require("axios");

// --- In-memory cache to store generated content for a short period ---
const cache = new Map();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

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
    // Fallback for non-markdown responses
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

async function generateAiImage(title, apiKey) {
    return makeRequestWithRetry(async () => {
        const imagePrompt = `Photorealistic, vibrant, high-quality stock photo representing the concept: "${title}". Clean, modern, eco-friendly aesthetic.`;
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
            { instances: { prompt: imagePrompt }, parameters: { "sampleCount": 1 } }
        );
        if (response.data?.predictions?.[0]?.bytesBase64Encoded) {
            const base64Data = response.data.predictions[0].bytesBase64Encoded;
            return `data:image/png;base64,${base64Data}`;
        }
        throw new Error("Invalid response structure from Imagen API.");
    });
}

// --- Main Handler ---
exports.handler = async function(event, context) {
    const { GEMINI_API_KEY } = process.env;
    if (!GEMINI_API_KEY) {
        return { statusCode: 500, body: JSON.stringify({ error: "API key is not configured." }) };
    }

    const { action, payload } = JSON.parse(event.body || "{}");
    const cacheKey = `${action}-${JSON.stringify(payload)}`;

    // Check cache first
    if (cache.has(cacheKey) && (Date.now() - cache.get(cacheKey).timestamp < CACHE_DURATION_MS)) {
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(cache.get(cacheKey).data),
        };
    }

    try {
        let responseData;

        switch (action) {
            case 'getArticleList':
                const topicGeneratorPrompt = `You are an expert content strategist for a sustainability blog in India. Generate 5 fresh, engaging article ideas. For each, provide a catchy title, a fictional author, a recent date, and a concise summary. **JSON Output (MUST follow this exactly):** \`\`\`json { "articles": [ { "id": "guide-to-eco-certifications", "title": "A Simple Guide to Eco-Certifications in India", "author": "Priya Sharma", "date": "August 10, 2025", "summary": "Decode the green labels on products and understand what they really mean.", "image": "https://placehold.co/800x400/16a34a/white?text=Eco+Labels" } ] } \`\`\``;
                const articleListText = await generateAiText(topicGeneratorPrompt, GEMINI_API_KEY);
                responseData = extractJson(articleListText);
                break;

            case 'getArticleContent':
                const { title, summary } = payload;
                if (!title || !summary) throw new Error("Article title and summary are required.");
                
                const articlePrompt = `You are an expert on sustainable living in India. Write a detailed, engaging blog post based on this title and summary. Use Markdown. Title: ${title}. Summary: ${summary}`;
                const keyTakeawaysPrompt = `Based on the article titled "${title}", generate a bulleted list of 3-4 "Key Takeaways".`;

                const [content, takeaways, image] = await Promise.all([
                    generateAiText(articlePrompt, GEMINI_API_KEY),
                    generateAiText(keyTakeawaysPrompt, GEMINI_API_KEY),
                    generateAiImage(title, GEMINI_API_KEY)
                ]);

                responseData = { content, takeaways, image };
                break;

            case 'askQuestion':
                if (!payload) throw new Error("No question provided.");
                const questionPrompt = `You are "Eco Jinner," an AI expert on sustainability in India. A user has asked the following question. Provide a clear, concise, and helpful answer (around 100-150 words). Then, suggest 3 related follow-up questions the user might have. User's Question: "${payload}". **JSON Output Structure (MUST follow this exactly):** \`\`\`json { "answer": "Your detailed answer goes here.", "relatedQuestions": ["Follow-up question 1?", "Follow-up question 2?", "Follow-up question 3?"] } \`\`\``;
                const aiResponse = await generateAiText(questionPrompt, GEMINI_API_KEY);
                responseData = extractJson(aiResponse);
                break;

            default:
                throw new Error("Invalid action.");
        }
        
        // Store successful response in cache
        cache.set(cacheKey, { timestamp: Date.now(), data: responseData });

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(responseData),
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
