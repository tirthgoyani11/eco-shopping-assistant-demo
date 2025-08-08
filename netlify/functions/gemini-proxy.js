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
    if (!title && !description) {
      return withCORS({ statusCode: 400, body: "Missing title or description" });
    }

    const GEMINI_KEY = "YOUR_GEMINI_API_KEY";
    const prompt =
      `Analyze the following product for eco-friendliness. Is it eco-friendly? If yes, state one main eco feature; if no, briefly explain why not:\nTitle: ${title}\nDescription: ${description}`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      }
    );

    const data = await geminiRes.json();
    let result = "No response.";

    if (
  data.candidates &&
  data.candidates &&
  data.candidates.content &&
  data.candidates.content.parts &&
  data.candidates.content.parts &&
  data.candidates.content.parts.text
) {
  result = data.candidates.content.parts.text;
  return withCORS({
    statusCode: 200,
    body: JSON.stringify({ result })
  });

    } else if (data.error) {
      return withCORS({ statusCode: 200, body: JSON.stringify({ error: data.error.message }) });
    } else {
      return withCORS({ statusCode: 200, body: JSON.stringify({ error: "Unknown error" }) });
    }
  } catch (e) {
    return withCORS({ statusCode: 500, body: JSON.stringify({ error: e.message }) });
  }
};
