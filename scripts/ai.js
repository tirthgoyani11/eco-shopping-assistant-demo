/**
 * Analyzes a product image using the Gemini API.
 * This function is designed to be called from the client-side,
 * with the API key handled securely in a production environment (e.g., Netlify).
 * @param {string} imageBase64 - The base64-encoded image data.
 * @returns {Promise<object>} A promise that resolves with the structured product data from the AI.
 */
export async function getProductInfo(imageBase64) {
    console.log("Sending image to Gemini for analysis...");

    // In a real Netlify deployment, you would use a serverless function
    // to hide your API key. For this client-side example, the key is
    // left blank and will be provided by the environment.
    const apiKey = ""; 
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    const prompt = `Analyze the product in this image. Based on its likely materials, packaging, and type, provide a sustainability analysis. Return the data *only* in the specified JSON format. Estimate the eco-score on a scale of A (best) to E (worst). Estimate the carbon footprint in kg CO2e. Suggest one eco-friendly alternative.`;

    const responseSchema = {
        type: "OBJECT",
        properties: {
            "name": { "type": "STRING" },
            "brand": { "type": "STRING" },
            "ecoScore": { "type": "STRING" },
            "carbonFootprint": { "type": "NUMBER" },
            "badges": { "type": "ARRAY", "items": { "type": "STRING" } },
            "alternatives": { "type": "ARRAY", "items": { "type": "OBJECT", "properties": { "name": { "type": "STRING" }, "description": { "type": "STRING" } } } }
        },
        required: ["name", "brand", "ecoScore", "carbonFootprint", "badges", "alternatives"]
    };

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
            ]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema
        }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0) {
            const productData = JSON.parse(result.candidates[0].content.parts[0].text);
            productData.image = `data:image/jpeg;base64,${imageBase64}`; // Use the captured image for display
            if (productData.alternatives && productData.alternatives.length > 0) {
                 productData.alternatives[0].image = `https://placehold.co/100x100/f0abfc/a21caf?text=Alt`;
            }
            console.log("Received structured data from Gemini:", productData);
            return productData;
        } else {
            throw new Error("No valid response from Gemini.");
        }

    } catch (error) {
        console.error("Error fetching from Gemini API:", error);
        return { name: 'Analysis Failed', brand: 'Please try again', image: `data:image/jpeg;base64,${imageBase64}`, ecoScore: '?', carbonFootprint: 0, badges: ['Error'], alternatives: [] };
    }
}

// --- MOCK DATA FOR OTHER FEATURES ---
const mockData = {
    favorites: [{ name: 'Oat Milk Powder', image: 'https://placehold.co/100x100/f0abfc/a21caf?text=Oat+Powder', ecoScore: 'A' }, { name: 'Bamboo Toothbrush', image: 'https://placehold.co/100x100/67e8f9/0e7490?text=Toothbrush', ecoScore: 'A' }],
    impact: { scanned: 12, plasticSaved: 3, choices: { excellent: 5, good: 4, poor: 3 } },
    learning: [{ title: 'Did you know?', content: 'Reducing plastic use by just one bottle a week can save over 1,200 bottles from landfills in your lifetime.', gradient: 'from-green-400 to-blue-500' }, { title: 'Quick Tip', content: 'Opting for products with minimal packaging significantly reduces your carbon footprint.', gradient: 'from-purple-400 to-pink-500' }]
};
export function getFavorites() { return mockData.favorites; }
export function getImpactData() { return mockData.impact; }
export function getLearningTips() { return mockData.learning; }
