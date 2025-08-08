// --- DEBUGGING VERSION ---
// This file only checks if the API key is accessible.

exports.handler = async function(event) {
    // Standard pre-flight check
    if (event.httpMethod === "OPTIONS") {
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

    try {
        const GEMINI_KEY = process.env.GEMINI_API_KEY;

        let statusMessage = "";
        let isKeyFound = false;

        if (GEMINI_KEY) {
            // Key was found. Let's show a small, non-secret part of it.
            statusMessage = `API Key Found! It starts with: ${GEMINI_KEY.substring(0, 4)}... and ends with: ...${GEMINI_KEY.slice(-4)}`;
            isKeyFound = true;
        } else {
            // Key was NOT found.
            statusMessage = "Error: GEMINI_API_KEY environment variable was NOT found on the server.";
            isKeyFound = false;
        }

        // Return the status message to the frontend
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            // We'll send the result in the same format your frontend expects
            body: JSON.stringify({
                result: JSON.stringify({
                    // This mimics the structure of a successful Gemini response
                    candidates: [{
                        content: {
                            parts: [{
                                text: `## Debugging Status\n\n**Key Found on Server:** ${isKeyFound}\n\n**Message:** ${statusMessage}`
                            }]
                        }
                    }]
                })
            })
        };

    } catch (e) {
        // This will catch any other unexpected errors
        return {
            statusCode: 500,
            headers: { "Access-control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "A critical error occurred in the debug function: " + e.message })
        };
    }
};
