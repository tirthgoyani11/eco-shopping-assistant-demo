const fetch = require('node-fetch');

exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  const body = JSON.parse(event.body || "{}");
  const { title, description } = body;
  if (!title && !description) {
    return { statusCode: 400, body: "Missing title or description" };
  }
  const GEMINI_KEY = "AIzaSyCdBFIzpAfPfk7tW9IUOSihKU20XmuyrGA";
  const prompt = `Analyze the following product for eco-friendliness. Is it eco-friendly? If yes, state one main eco feature; if no, briefly explain why not:\nTitle: ${title}\nDescription: ${description}`;
  try {
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const data = await geminiRes.json();
    let result = "No response.";
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates.content &&
      data.candidates.content.parts &&
      data.candidates.content.parts &&
      data.candidates.content.parts.text
    ) {
      result = data.candidates.content.parts.text;
    } else if (data.error) {
      result = "API error: " + data.error.message;
    }
    return { statusCode: 200, body: JSON.stringify({ result }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
