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
  // Return the Gemini answer in the "result" property
  return withCORS({
    statusCode: 200,
    body: JSON.stringify({ result: data.candidates.content.parts.text })
  });
} else if (data.error) {
  // If Gemini sends an actual error message
  return withCORS({
    statusCode: 200,
    body: JSON.stringify({ error: data.error.message })
  });
} else {
  // Only return raw Gemini response if something is really broken
  return withCORS({
    statusCode: 200,
    body: JSON.stringify({ error: "Gemini backend failed: " + JSON.stringify(data) })
  });
}
