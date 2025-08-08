const fetch = require("node-fetch");
exports.handler = async function(event) {
  // Your CORS and method check as before...

  try {
    const body = JSON.parse(event.body || "{}");
    let { title, description } = body;

    const textPrompt =
      (title || description)
        ? `Analyze the following product for eco-friendliness. Is it eco-friendly? If yes, state one main eco feature; if no, briefly explain why not:\nTitle: ${title}\nDescription: ${description || "No description provided"}`
        : "Explain how AI works in a few words";

    const GEMINI_KEY = "AIzaSyCdBFIzpAfPfk7tW9IUOSihKU20XmuyrGA";

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GEMINI_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: textPrompt }]
          }]
        })
      }
    );

    const data = await response.json();

    // No filtering or pre-formatting: just always send Gemini's raw response
    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ result: JSON.stringify(data, null, 2) })
    };

  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ result: "AI backend error: " + (e.message || "Unknown") })
    };
  }
};
