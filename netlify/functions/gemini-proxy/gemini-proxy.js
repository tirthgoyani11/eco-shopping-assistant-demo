const axios = require("axios");

// --- The Image Scout Function ---
async function getGoogleImage(keyword, apiKey) {
    try {
        const response = await axios.post('https://google.serper.dev/images', {
            q: keyword,
            gl: 'in', // Geolocation: India
        }, {
            headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' }
        });
        const firstImage = response.data.images.find(img => img.imageUrl);
        return firstImage ? firstImage.imageUrl : "https://placehold.co/400x400/2c5364/e5e7eb?text=Image+Not+Found";
    } catch (error) {
        console.error(`Image scraper failed for keyword: "${keyword}"`);
        return "https://placehold.co/400x400/2c5364/e5e7eb?text=Image+Error";
    }
}

// --- The Main Handler ---
exports.handler = async function(event) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    try {
        const body = JSON.parse(event.body || "{}");
        const { category, title } = body;
        if (!title || !category) return { statusCode: 400, body: JSON.stringify({ error: "Title and category are required." }) };

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        const SERPER_KEY = process.env.SERPER_API_KEY;
        if (!GEMINI_KEY || !SERPER_KEY) throw new Error("API keys are not configured.");

        // --- Step 1: The AI Analyst (Fast Keyword Generation) ---
        const analystPrompt = `
            You are a senior product analyst. Analyze the user's product and create a research plan.
            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "productName": "User's Product Name",
              "isRecommended": false,
              "verdict": "A short, clear verdict.",
              "summary": "A detailed analysis in Markdown format.",
              "recommendationsTitle": "Better, Eco-Friendly Alternatives",
              "scoutKeywords": ["Stainless Steel Water Bottle", "Glass Water Bottle with Silicone Sleeve", "Handmade Copper Water Vessel"]
            }
            \`\`\`
            --- USER INPUT ---
            Category: ${category}
            Title: ${title}
        `;

        // Using the standard name for the latest Flash model.
        const modelUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`;
        
        const geminiAnalystResponse = await axios.post(
            modelUrl,
            { contents: [{ parts: [{ text: analystPrompt }] }] }
        );
        const analystResult = JSON.parse(geminiAnalystResponse.data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```g, "").trim());

        // --- Step 2: The Image Scouts (Parallel, Fast Search) ---
        const productScoutPromise = getGoogleImage(analystResult.productName, SERPER_KEY);
        const recommendationScoutPromises = (analystResult.scoutKeywords || []).map(keyword => getGoogleImage(keyword, SERPER_KEY));
        
        const [productImage, ...recommendationImages] = await Promise.all([productScoutPromise, ...recommendationScoutPromises]);

        // --- Step 3: The AI Decorator (Final Polish) ---
        const decoratorPrompt = `
            You are a creative assistant. For each of the following keywords, write a short, compelling description and generate a reliable Google search link for buying it in India.
            **JSON Output Structure (MUST follow this exactly):**
            \`\`\`json
            {
              "items": [
                {
                  "name": "Stainless Steel Water Bottle",
                  "description": "Durable, reusable, and keeps your drinks at the perfect temperature.",
                  "link": "https://www.google.com/search?q=Stainless+Steel+Water+Bottle+buy+online+india"
                }
              ]
            }
            \`\`\`
            --- KEYWORD LIST TO DECORATE ---
            ${JSON.stringify(analystResult.scoutKeywords)}
        `;

        // Using the same model URL for the second call.
        const geminiDecoratorResponse = await axios.post(
            modelUrl,
            { contents: [{ parts: [{ text: decoratorPrompt }] }] }
        );
        const decoratedItems = JSON.parse(geminiDecoratorResponse.data.candidates[0].content.parts[0].text.replace(/```json/g, "").replace(/```g, "").trim()).items;
        
        // Combine the decorated text with the reliable images
        const finalItems = decoratedItems.map((item, index) => ({
            ...item,
            image: recommendationImages[index]
        }));

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
        return { statusCode: 500, body: JSON.stringify({ error: "An internal server error occurred: " + (e.response ? (e.response.data.error ? e.response.data.error.message : JSON.stringify(e.response.data)) : e.message) }) };
    }
};
