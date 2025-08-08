const https = require('https');

exports.handler = async function(event) {
    console.log("--- Eco Jinner Function Execution Started ---");

    if (event.httpMethod !== "POST") {
        console.log(`Request rejected. Method was ${event.httpMethod}, not POST.`);
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        console.log("Step 1: Parsing request body...");
        const body = JSON.parse(event.body || "{}");
        const { category, title } = body;
        if (!title || !category) throw new Error("Title and category are required.");
        console.log(`Successfully parsed body. Category: ${category}, Title: ${title}`);

        console.log("Step 2: Checking for API Key...");
        const GEMINI_KEY = process.env.GEMINI_API_KEY;
        if (!GEMINI_KEY) throw new Error("CRITICAL: GEMINI_API_KEY environment variable not found on the server!");
        console.log("API Key found successfully.");

        console.log("Step 3: Constructing AI Prompt...");
        const prompt = `Analyze this product: Category: ${category}, Title: ${title}`;
        const postData = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            ],
        });
        console.log("Prompt constructed.");

        const options = {
            hostname: 'generativelanguage.googleapis.com',
            path: `/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_KEY}`,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
        };

        console.log("Step 4: Sending request to Google API...");
        const data = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseBody = '';
                res.on('data', (chunk) => { responseBody += chunk; });
                res.on('end', () => {
                    console.log(`Received response from Google with status: ${res.statusCode}`);
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(JSON.parse(responseBody));
                    } else {
                        reject(new Error(`API request failed with status ${res.statusCode}: ${responseBody}`));
                    }
                });
            });
            req.on('error', (e) => reject(e));
            req.write(postData);
            req.end();
        });
        console.log("Step 5: Successfully received and parsed data from Google.");

        const rawText = data.candidates[0].content.parts[0].text;
        
        console.log("Step 6: Sending successful response to frontend.");
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ result: rawText }) // Send back simple text for this test
        };

    } catch (e) {
        console.error("--- FATAL ERROR IN FUNCTION ---");
        console.error("Error Message:", e.message);
        console.error("Error Stack:", e.stack);
        return {
            statusCode: 500,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ error: "An internal server error occurred. Check the function logs for details." })
        };
    }
};
