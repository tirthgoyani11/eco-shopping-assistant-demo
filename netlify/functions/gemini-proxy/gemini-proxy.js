const axios = require("axios");

// --- The Image Scout Function ---
// This uses the Serper API to get real, live Google Image search results.
// No changes are needed here.
async function getGoogleImage(keyword, apiKey) {
    try {
        const response = await axios.post('https://google.serper.dev/images', {
            q: keyword,
            gl: 'in', // Geolocation: India
        }, {
            headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' }
        });
        // Find the first high-quality image URL
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
        // --- FIX 1: Accepting 'description' from the frontend instead of 'category' ---
        const { title, description } = body;
        if (!title) return { statusCode: 400, body: JSON.stringify({ error: "Title is required." }) };

        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        const SERPER_KEY = process.env.SERPER_API_KEY;
        if (!GEMINI_KEY || !SERPER_KEY) throw new Error("API keys are not configured.");

        // --- Step 1: The AI Analyst (Fast Keyword Generation) ---
        // --- FIX 2: Updated prompt to use 'description' ---
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
            Title: ${title}
            Description: ${description || 'No description provided.'}
        `;

        const geminiAnalystResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
            { contents: [{ parts: [{ text: analystPrompt }] }] }
        );
        const analystResultText = geminiAnalystResponse.data.candidates[0].content.parts[0].text;
        const analystResult = JSON.parse(analystResultText.replace(/```json/g, "").replace(/```/g, "").trim());

        // --- Step 2: The Image Scouts (Parallel, Fast Search) ---
        // This part of the logic remains the same.
        const productScoutPromise = getGoogleImage(analystResult.productName, SERPER_KEY);
        const recommendationScoutPromises = (analystResult.scoutKeywords || []).map(keyword => getGoogleImage(keyword, SERPER_KEY));
        
        const [productImage, ...recommendationImages] = await Promise.all([productScoutPromise, ...recommendationScoutPromises]);

        // --- Step 3: The AI Decorator (Final Polish) ---
        // This part of the logic remains the same.
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

        const geminiDecoratorResponse = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
            { contents: [{ parts: [{ text: decoratorPrompt }] }] }
        );
        const decoratedItemsText = geminiDecoratorResponse.data.candidates[0].content.parts[0].text;
        const decoratedItems = JSON.parse(decoratedItemsText.replace(/```json/g, "").replace(/```/g, "").trim()).items;
        
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
        
        // --- FIX 3: Format the rich data into a single Markdown string for the frontend ---
        let markdownOutput = `## ${finalResponse.productName}\n\n`;
        markdownOutput += `**Verdict:** ${finalResponse.verdict}\n\n`;
        markdownOutput += `${finalResponse.summary}\n\n`;
        markdownOutput += `### ${finalResponse.recommendations.title}\n\n`;
        finalResponse.recommendations.items.forEach(item => {
            markdownOutput += `* **${item.name}:** ${item.description}\n`;
        });

        // --- FIX 4: Create a fake Gemini response object that the frontend expects ---
        const fakeGeminiPayload = {
            candidates: [{
                content: {
                    parts: [{ text: markdownOutput }]
                }
            }]
        };

        // --- FIX 5: Wrap the fake payload in the 'result' object the frontend needs ---
        const responseForFrontend = {
            result: JSON.stringify(fakeGeminiPayload)
        };

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" }, // For CORS
            body: JSON.stringify(responseForFrontend),
        };

    } catch (e) {
        console.error("Backend Error:", e.response ? e.response.data : e.message);
        const errorMessage = e.response ? (e.response.data.error ? e.response.data.error.message : JSON.stringify(e.response.data)) : e.message;
        // Also wrap the error response in the structure the frontend expects
        const errorPayload = {
            error: { message: "An internal server error occurred: " + errorMessage }
        };
        const responseForFrontend = {
            result: JSON.stringify(errorPayload)
        };
        return { 
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(responseForFrontend)
        };
    }
};
