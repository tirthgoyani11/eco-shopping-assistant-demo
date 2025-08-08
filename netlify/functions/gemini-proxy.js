const fetch = require("node-fetch");

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
    const { title, description } = body;

    const textPrompt =
      (title || description)
        ? `Analyze the following product for eco-friendliness. Is it eco-friendly? If yes, state one main eco feature; if no, briefly explain why not:\nTitle: ${title}\nDescription: ${description}`
        : "Explain how AI works in a few words";

    const GEMINI_KEY = "AIzaSyDEsa0-qw_olb30gI6Gypf60lBohGYw_XY"; // <-- Replace with your actual key (inside quotes)

    // Gemini API call to the correct model endpoint
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

    // Return Gemini answer if present
 if (
  data.candidates &&
  data.candidates[0] &&
  data.candidates.content &&
  data.candidates.content.parts &&
  data.candidates.content.parts &&
  data.candidates.content.parts.text
) {
  // Return the Gemini answer
  return withCORS({
    statusCode: 200,
    body: JSON.stringify({ result: data.candidates.content.parts.text })
  });
} else if (data.candidates && data.candidates.length > 0) {
  // If candidates exist, but the main text is missing, pull anything text-like
  const altText = JSON.stringify(data.candidates);
  return withCORS({
    statusCode: 200,
    body: JSON.stringify({ result: "AI did not provide a direct answer, but here’s what it said: " + altText })
  });
} else if (data.error && data.error.message) {
  // If Gemini sends an error, make it look like a human message
  return withCORS({
    statusCode: 200,
    body: JSON.stringify({ result: "AI could not process this product. Message: " + data.error.message })
  });
} else {
  // Catch-all: always send a friendly default
  return withCORS({
    statusCode: 200,
    body: JSON.stringify({ result: "AI could not analyze this product, but you can try another name, spelling, or give more description!" })
  });
}
