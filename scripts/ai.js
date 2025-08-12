/**
 * Calls the secure Netlify serverless function to analyze an image.
 * @param {string} imageBase64 - The base64-encoded image data.
 * @returns {Promise<object>} A promise that resolves with the full analysis from the backend.
 */
export async function getProductInfo(imageBase64) {
    // This is the standard endpoint for a Netlify function named 'gemini-proxy'.
    const functionUrl = '/.netlify/functions/gemini-proxy';

    try {
        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // The body now sends the image data to your serverless function.
            body: JSON.stringify({ image: imageBase64 })
        });

        if (!response.ok) {
            const errorBody = await response.json();
            console.error("Backend function error:", errorBody);
            throw new Error(`Backend function failed with status: ${response.status}`);
        }
        
        const productData = await response.json();
        // Add the user's uploaded image to the final result for display
        productData.image = `data:image/jpeg;base64,${imageBase64}`;
        return productData;

    } catch (error) {
        console.error("Error calling Netlify function:", error);
        return { 
            name: 'Analysis Failed', 
            brand: 'Could not connect to the AI bot.', 
            image: `data:image/jpeg;base64,${imageBase64}`, 
            product_category: 'Unknown' 
        };
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
