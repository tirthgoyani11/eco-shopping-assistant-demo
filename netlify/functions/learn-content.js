/**
 * Netlify Function: learn-content.js (Titan Engine - Definitive Version)
 * -----------------------------------------------------------------
 * This definitive version uses a multi-stage "Titan" AI process:
 * 1. An AI Content Strategist generates fresh, relevant article topics.
 * 2. An AI Author & Artist writes full articles and creates images on demand.
 * 3. An AI Expert answers user questions in the Q&A section.
 */

const axios = require("axios");

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

    try {
        let responseData;

        switch (action) {
            // Case 1: AI Content Strategist generates the list of articles
            case 'getArticleList':
                const topicGeneratorPrompt = `
                    You are an expert content strategist for a sustainability blog in India. Your task is to generate 5 fresh, engaging, and relevant article ideas.
                    For each idea, provide a catchy title, a fictional author name, a recent date, and a concise one-sentence summary. For the image, provide a standard placeholder URL.

                    **JSON Output (MUST follow this exactly):**
                    \`\`\`json
                    {
                      "articles": [
                        { "id": "guide-to-eco-certifications", "title": "A Simple Guide to Eco-Certifications in India", "author": "Priya Sharma", "date": "August 10, 2025", "summary": "Decode the green labels on products and understand what they really mean.", "image": "https://placehold.co/800x400/16a34a/white?text=Eco+Labels" },
                        { "id": "zero-waste-kitchen", "title": "Zero-Waste Kitchen: 5 Easy Swaps", "author": "Rohan Desai", "date": "August 5, 2025", "summary": "Discover simple and affordable swaps to drastically reduce waste in your kitchen.", "image": "https://placehold.co/800x400/fbbf24/white?text=Kitchen+Swaps" },
                        { "id": "clean-beauty-guide", "title": "Clean Beauty: 5 Ingredients to Avoid", "author": "Anjali Mehta", "date": "July 28, 2025", "summary": "Learn about common harmful chemicals in cosmetics and how to choose safer alternatives.", "image": "https://placehold.co/800x400/f472b6/white?text=Clean+Beauty" }
                      ]
                    }
                    \`\`\`
                `;
                const articleListText = await generateAiText(topicGeneratorPrompt, GEMINI_API_KEY);
                responseData = extractJson(articleListText);
                break;

            // Case 2: AI Author & Artist generates the full content of a single article
            case 'getArticleContent':
                const { title, summary } = payload;
                if (!title || !summary) throw new Error("Article title and summary are required.");
                
                const articlePrompt = `You are an expert on sustainable living in India. Write a detailed, engaging blog post based on this title and summary. Use Markdown. Title: ${title}. Summary: ${summary}`;
                const keyTakeawaysPrompt = `Based on the article titled "${title}", generate a bulleted list of 3-4 "Key Takeaways".`;

                // Run all AI tasks in parallel for maximum efficiency
                const [content, takeaways, image] = await Promise.all([
                    generateAiText(articlePrompt, GEMINI_API_KEY),
                    generateAiText(keyTakeawaysPrompt, GEMINI_API_KEY),
                    generateAiImage(title, GEMINI_API_KEY)
                ]);

                responseData = { content, takeaways, image };
                break;

            // Case 3: AI Expert answers a user's question
            case 'askQuestion':
                if (!payload) throw new Error("No question provided.");
                const questionPrompt = `You are "EcoGenie," an AI expert on sustainability in India. A user has asked: "${payload}". Provide a clear, concise answer (around 100 words) and suggest 3 related follow-up questions. **JSON Output (MUST follow this exactly):** \`\`\`json { "answer": "Your answer.", "relatedQuestions": ["Question 1?", "Question 2?", "Question 3?"] } \`\`\``;
                const aiResponse = await generateAiText(questionPrompt, GEMINI_API_KEY);
                responseData = extractJson(aiResponse);
                break;

            default:
                throw new Error("Invalid action.");
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(responseData),
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
