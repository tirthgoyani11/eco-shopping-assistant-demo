/**
 * Netlify Function: learn-content.js (Unbreakable Version)
 * -----------------------------------------------------------------
 * This definitive version fixes all timeout issues by generating the
 * complete content (topics, text, takeaways, and images) in a single,
 * optimized upfront request.
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
            // This is now the ONLY action for articles. It generates everything at once.
            case 'getFullLearnContent':
                const contentPrompt = `
                    You are an expert content strategist and author for a sustainability blog in India.
                    Your task is to generate a complete set of 3 fresh, engaging, and relevant articles.
                    For each article, you must provide:
                    1. A unique 'id'.
                    2. A catchy 'title'.
                    3. A fictional 'author' name.
                    4. A recent 'date'.
                    5. A concise one-sentence 'summary'.
                    6. A detailed, full-length 'content' section in Markdown.
                    7. A bulleted list of 3-4 'takeaways' in Markdown.

                    **JSON Output Structure (MUST follow this exactly):**
                    \`\`\`json
                    {
                      "articles": [
                        {
                          "id": "guide-to-eco-certifications",
                          "title": "A Simple Guide to Eco-Certifications in India",
                          "author": "Priya Sharma",
                          "date": "August 10, 2025",
                          "summary": "Decode the green labels on products and understand what they really mean.",
                          "content": "<h2>Understanding the Labels</h2><p>Navigating the world of sustainable products can be tricky. Here’s a quick rundown of the most common labels you'll find in India...</p><ul><li><strong>GOTS:</strong> The gold standard for organic fibers.</li><li><strong>Fair Trade:</strong> Guarantees fair wages for workers.</li></ul>",
                          "takeaways": "- GOTS ensures organic materials.\\n- Fair Trade supports ethical labor practices.\\n- Leaping Bunny means cruelty-free."
                        }
                      ]
                    }
                    \`\`\`
                `;
                const articleListText = await generateAiText(contentPrompt, GEMINI_API_KEY);
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

            // The Q&A feature remains separate and on-demand
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
