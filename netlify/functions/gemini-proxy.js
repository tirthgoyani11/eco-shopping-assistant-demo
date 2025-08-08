const fetch = require("node-fetch");
const cheerio = require("cheerio");

exports.handler = async function(event) {
  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  function withCORS(resp) {
    return {
      ...resp,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        ...(resp.headers || {})
      }
    };
  }

  if (event.httpMethod !== "POST") {
    return withCORS({ statusCode: 405, body: "Method Not Allowed" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    let { title, description, productUrl } = body;

    // If productUrl is provided, scrape that page for title and description
    if (productUrl) {
      try {
        const pageRes = await fetch(productUrl);
        if (!pageRes.ok) throw new Error("Product page fetch failed");
        const html = await pageRes.text();
        const $ = cheerio.load(html);

        // Amazon selectors (adjust for other sites as needed)
        title = $('#productTitle').text().trim() || title;
        description = $('#feature-bullets').text().trim() || description;

        // For other sites: change the selectors to match their HTML
      } catch (e) {
        // Fall back to user-provided text if scraping fails
        description = description || `Could not fetch description. Reason: ${e.message}`;
      }
    }

    const textPrompt =
      (title || description)
        ? `Analyze the following product for eco-friendliness. Is it eco-friendly? If yes, state one main eco feature; if no, briefly explain why not:\nTitle: ${title}\nDescription: ${description}`
        : "Explain how AI works in a few words";

    const GEMINI_KEY = "AIzaSyCdBFIzpAfPfk7tW9IUOSihKU20XmuyrGA"; // <-- YOUR KEY HERE

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: textPrompt
            }]
          }]
        })
      }
    );

    const data = await response.json();

    // Main Gemini answer logic (as before)
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates.content &&
      data.candidates.content.parts &&
      data.candidates.content.parts &&
      data.candidates.content.parts.text
    ) {
      return withCORS({
        statusCode: 200,
        body: JSON.stringify({ result: data.candidates.content.parts.text })
      });
    } else if (
      data.candidates &&
      data.candidates &&
      data.candidates.content &&
      data.candidates.content.parts &&
      data.candidates.content.parts
    ) {
      // Fallback: show anything in candidates parts
      const maybeText = JSON.stringify(data.candidates.content.parts);
      return withCORS({
        statusCode: 200,
        body: JSON.stringify({ result: "AI response: " + maybeText })
      });
    } else if (data.error && data.error.message) {
      // Fallback for any Gemini error
      return withCORS({
        statusCode: 200,
        body: JSON.stringify({ result: "AI could not process. Details: " + data.error.message })
      });
    } else {
      // Absolute fallback: always show a helpful message
      return withCORS({
        statusCode: 200,
        body: JSON.stringify({ result: "AI could not analyze this product. Try changing the spelling, being more specific, or giving a short description!" })
      });
    }

  } catch (e) {
    return withCORS({
      statusCode: 500,
      body: JSON.stringify({ result: "AI backend error: " + (e.message || "Unknown") })
    });
  }
};
