/**
 * Netlify Function: learn-content.js (Complete & Merged)
 * ----------------------------------------------------
 * This is the definitive AI engine for the "Learn" Hub. It handles:
 * 1. AI-Generated Images for articles.
 * 2. AI-Generated Text (full content and takeaways) for articles.
 * 3. AI-Powered Q&A for user questions.
 */

const axios = require("axios");

// --- Base Article Data ---
const articles = [
    {
        id: "guide-to-eco-certifications",
        title: "A Simple Guide to Eco-Certifications in India",
        author: "Priya Sharma",
        date: "August 10, 2025",
        summary: "Ever felt confused by all the green labels on products? We break down what certifications like GOTS, Fair Trade, and Leaping Bunny actually mean for you and the planet.",
    },
    {
        id: "kitchen-swaps",
        title: "5 Simple Swaps for a More Sustainable Kitchen",
        author: "Rohan Desai",
        date: "August 5, 2025",
        summary: "Ready to reduce waste in your kitchen? These five easy and affordable swaps are a great place to start, from ditching plastic wrap to composting your food scraps.",
    },
    {
        id: "cosmetic-ingredients",
        title: "Clean Beauty: 5 Cosmetic Ingredients to Avoid",
        author: "Anjali Mehta",
        date: "July 28, 2025",
        summary: "The beauty industry can be full of confusing ingredients. We highlight five common chemicals to look out for and explain why choosing cleaner alternatives is better for your skin and health.",
    }
];

// --- AI Helper Functions ---
async function generateAiContent(prompt, apiKey) {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`,
            { contents: [{ parts: [{ text: prompt }] }] }
        );
        return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Gemini API request failed:", error.response ? error.response.data : error.message);
        throw new Error("Failed to generate text from AI.");
    }
}

async function generateAiImage(title, apiKey) {
    try {
        const imagePrompt = `Photorealistic, vibrant, high-quality stock photo representing the concept: "${title}". The image should be clean, modern, and have a positive, eco-friendly aesthetic.`;
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
            {
                instances: { prompt: imagePrompt },
                parameters: { "sampleCount": 1 }
            }
        );
        const base64Data = response.data.predictions[0].bytesBase64Encoded;
        return `data:image/png;base64,${base64Data}`;
    } catch (error) {
        console.error("Imagen API request failed:", error.response ? error.response.data : error.message);
        return `https://placehold.co/800x400/334155/white?text=Image+Generation+Error`;
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
                responseData = { articles };
                break;

            case 'getArticleContent':
                const article = articles.find(a => a.id === payload);
                if (!article) throw new Error("Article not found.");
                
                const articlePrompt = `You are an expert on sustainable living in India. Write a detailed, engaging, and informative blog post based on the following title and summary. Use Markdown for formatting (headings, lists, bold text). Title: ${article.title}. Summary: ${article.summary}`;
                const keyTakeawaysPrompt = `Based on the article titled "${article.title}", generate a bulleted list of 3-4 "Key Takeaways". The tone should be concise and easy to understand.`;

                const [content, takeaways, image] = await Promise.all([
                    generateAiContent(articlePrompt, GEMINI_API_KEY),
                    generateAiContent(keyTakeawaysPrompt, GEMINI_API_KEY),
                    generateAiImage(article.title, GEMINI_API_KEY)
                ]);

                responseData = { content, takeaways, image };
                break;

            case 'askQuestion':
                if (!payload) throw new Error("No question provided.");
                const questionPrompt = `You are "Eco Jinner," an AI expert on sustainability in India. A user has asked the following question. Provide a clear, concise, and helpful answer (around 100-150 words). Then, suggest 3 related follow-up questions the user might have. User's Question: "${payload}". **JSON Output Structure (MUST follow this exactly):** \`\`\`json { "answer": "Your detailed answer goes here.", "relatedQuestions": ["Follow-up question 1?", "Follow-up question 2?", "Follow-up question 3?"] } \`\`\``;
                const aiResponse = await generateAiContent(questionPrompt, GEMINI_API_KEY);
                responseData = JSON.parse(aiResponse.replace(/```json/g, "").replace(/```/g, "").trim());
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
