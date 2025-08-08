// --- DEEP DEBUGGING VERSION ---

// Note: No 'require("node-fetch")' needed in modern Netlify runtimes.
// This removes a potential point of failure.

exports.handler = async function(event) {
    console.log("--- Function execution started ---");

    // 1. Standard Pre-flight and Method Checks
    if (event.httpMethod === "OPTIONS") {
        console.log("Handling OPTIONS pre-flight request.");
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: "",
        };
    }
    console.log(`Received a ${event.httpMethod} request.`);

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // 2. Parse Input and Log
        console.log("Step 2: Parsing request body...");
        let body;
        try {
            body = JSON.parse(event.body || "{}");
        } catch (e) {
            console.error("CRITICAL: Failed to parse event.body.", e);
            throw new Error("Invalid JSON in request body.");
        }
        
        const { title, description } = body;
        console.log("Successfully parsed body. Input:", { title, description });

        if (!title && !description) {
            throw new Error("Validation failed: Title and description are missing.");
        }

        // 3. Construct the Prompt
        const prompt = `Analyze: "${title}" - "${description || 'N/A'}"`;
        console.log("Step 3: Constructed a simple prompt.");

        // 4. Check for API Key
        console.log("Step 4: Checking for API Key...");
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) {
            console.error("CRITICAL: GEMINI_API_KEY environment variable not found!");
            throw new Error("API key is not configured on the server.");
        }
        console.log("API Key found successfully.");

        // 5. Call the Gemini API
        const modelToUse = "gemini-2.0-flash";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent?key=${GEMINI_KEY}`;
        
        console.log(`Step 5: Sending POST request to Google API for model: ${modelToUse}`);
        
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        console.log(`Received response from Google with status: ${response.status}`);

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Google API Error Response:", JSON.stringify(errorData, null, 2));
            throw new Error(`Google API responded with an error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Successfully received and parsed data from Google.");

        // 6. Return the successful response
        console.log("Step 6: Sending successful response to frontend.");
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ result: JSON.stringify(data) })
        };

    } catch (e) {
        console.error("--- FATAL ERROR IN TRY-CATCH BLOCK ---");
        console.error(e);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "An internal server error occurred: " + e.message })
        };
    }
};
