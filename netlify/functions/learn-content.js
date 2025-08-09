/**
 * Netlify Function: learn-content.js (Fixed & Optimized)
 * ----------------------------------------------------
 * This version fixes the timeout bug by re-architecting the AI workflow.
 * It now generates images upfront with the article list for better performance.
 */

const axios = require("axios");

// --- Helper function to safely extract JSON from AI text response ---
function extractJson(text) {
    const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = text.match(jsonRegex);
    if (match && match[1]) {
        return JSON.parse(match[1]);
    }
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Failed to parse JSON from AI response:", text);
        throw new Error("AI returned data in an unexpected format.");
    }
}

// --- AI Helper Functions ---
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

async function generateAiImage(title, apiKey) {
    try {
        const imagePrompt = `Photorealistic, vibrant, high-quality stock photo representing the concept: "${title}". The image should be clean, modern, and have a positive, eco-friendly aesthetic.`;
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
            { instances: { prompt: imagePrompt }, parameters: { "sampleCount": 1 } }
        );
        if (response.data?.predictions?.[0]?.bytesBase64Encoded) {
            const base64Data = response.data.predictions[0].bytesBase64Encoded;
            return `data:image/png;base64,${base64Data}`;
        }
        throw new Error("Invalid response structure from Imagen API.");
    } catch (error) {
        console.error("Imagen API Error:", error.response ? error.response.data : error.message);
        return `https://placehold.co/800x400/334155/white?text=Image+Error`;
    }
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
            case 'getArticleList':
                const topicGeneratorPrompt = `You are an expert content strategist for a sustainability blog in India. Generate 5 fresh, engaging article ideas. For each, provide a catchy title, a fictional author, a recent date, and a concise summary. **JSON Output (MUST follow this exactly):** \`\`\`json { "articles": [ { "id": "guide-to-eco-certifications", "title": "A Simple Guide to Eco-Certifications in India", "author": "Priya Sharma", "date": "August 10, 2025", "summary": "Decode the green labels on products and understand what they really mean." } ] } \`\`\``;
                const articleListText = await generateAiText(topicGeneratorPrompt, GEMINI_API_KEY);
                let { articles } = extractJson(articleListText);

                // Now, generate an image for each article in parallel
                const imagePromises = articles.map(article => generateAiImage(article.title, GEMINI_API_KEY));
                const images = await Promise.all(imagePromises);

                // Add the generated image URL to each article object
                articles = articles.map((article, index) => ({
                    ...article,
                    image: images[index]
                }));

                responseData = { articles };
                break;

            case 'getArticleContent':
                const { title, summary } = payload;
                if (!title || !summary) throw new Error("Article title and summary are required.");
                
                const articlePrompt = `You are an expert on sustainable living in India. Write a detailed, engaging blog post based on this title and summary. Use Markdown. Title: ${title}. Summary: ${summary}`;
                const keyTakeawaysPrompt = `Based on the article titled "${title}", generate a bulleted list of 3-4 "Key Takeaways".`;

                const [content, takeaways] = await Promise.all([
                    generateAiText(articlePrompt, GEMINI_API_KEY),
                    generateAiText(keyTakeawaysPrompt, GEMINI_API_KEY)
                ]);

                responseData = { content, takeaways };
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

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(responseData),
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
