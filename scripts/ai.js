/**
 * Analyzes a product image using the Gemini API with the advanced SCOUT Bot algorithm.
 * @param {string} imageBase64 - The base64-encoded image data.
 * @returns {Promise<object>} A promise that resolves with the structured product data from the AI.
 */
export async function getProductInfo(imageBase64) {
    console.log("Sending image to Gemini for analysis...");

    // The 'apiKey' is intentionally left blank. In a secure environment like this,
    // it will be automatically and safely provided when the API call is made.
    const apiKey = ""; 
    
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    // This is the final, 10-layer SCOUT Bot prompt.
    const prompt = `Execute the 10-layer SCOUT bot algorithm.
1.  **Scan & Specify:** Analyze the image to identify the product's name, brand, and key attributes.
2.  **Categorize & Compare:** First, determine if the product is 'Food' or 'Non-Food'.
3.  **Optimize & Order:** Find ONE best alternative. If 'Food', find a healthier alternative. If 'Non-Food', find a low-carbon alternative.
4.  **Identify Alternative Type:** Classify this best alternative as 'Commercial Product' or 'Home-made Remedy/DIY'.
5.  **Uncover & Link (Commercial):** If commercial, attempt to find a specific, direct product purchase link on Amazon.in.
6.  **Navigate & Search (Fallback):** If no direct link, provide a 'search_query' for Google Shopping.
7.  **Generate & Instruct (Recipe/DIY):** If it's a home-made remedy or DIY, provide a short 'recipe' (for food) or 'diy_instructions' (for non-food) as an array of strings.
8.  **Generalize & Guide:** ALWAYS provide a second, separate 'general_alternative' which is a non-purchase, lifestyle suggestion.
9.  **Verify & Validate:** Ensure all outputs are logical and relevant.
10. **Transmit & Tell:** Return a single JSON object with the results.`;

    const responseSchema = { 
        type: "OBJECT", 
        properties: { 
            "name": { "type": "STRING" }, 
            "brand": { "type": "STRING" }, 
            "product_category": { "type": "STRING", "enum": ["Food", "Non-Food"] }, 
            "ecoScore": { "type": "STRING" }, 
            "carbonFootprint": { "type": "NUMBER" }, 
            "health_analysis": { 
                "type": "OBJECT", 
                "properties": { 
                    "rating": { "type": "STRING" }, 
                    "health_concern": { "type": "STRING" }, 
                    "sufficient_intake": { "type": "STRING" } 
                } 
            }, 
            "alternatives": { 
                "type": "ARRAY", 
                "items": { 
                    "type": "OBJECT", 
                    "properties": { 
                        "name": { "type": "STRING" }, 
                        "reason": { "type": "STRING" }, 
                        "link": { "type": "STRING" }, 
                        "search_query": { "type": "STRING" }, 
                        "recipe": { "type": "ARRAY", "items": { "type": "STRING" } }, 
                        "diy_instructions": { "type": "ARRAY", "items": { "type": "STRING" } } 
                    } 
                } 
            } 
        }, 
        required: ["name", "brand", "product_category"] 
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
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(`API call failed with status: ${response.status}`);
        const result = await response.json();
        if (result.candidates && result.candidates.length > 0) {
            const productData = JSON.parse(result.candidates[0].content.parts[0].text);
            productData.image = `data:image/jpeg;base64,${imageBase64}`;
            return productData;
        } else { 
            throw new Error("No valid response from Gemini."); 
        }
    } catch (error) { 
        console.error("Error fetching from Gemini API:", error); 
        return { name: 'Analysis Failed', brand: 'Please try again', image: `data:image/jpeg;base64,${imageBase64}`, product_category: 'Unknown' }; 
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
