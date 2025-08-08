document.getElementById('analyze-btn').onclick = async function () {
  const title = document.getElementById('prod-title').value.trim();
  const desc = document.getElementById('prod-desc').value.trim();

  if (!title && !desc) {
    document.getElementById('ai-result').innerText = "Please enter a product title or description.";
    return;
  }
  document.getElementById('ai-result').innerText = "Analyzing via Gemini...";

  try {
    const response = await fetch('https://ecojinner.netlify.app/.netlify/functions/gemini-proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc }),
    });
    const data = await response.json();

    if (data.result) {
      try {
        const raw = JSON.parse(data.result);
        if (
          raw.candidates &&
          Array.isArray(raw.candidates) &&
          raw.candidates[0] &&
          raw.candidates.content &&
          raw.candidates.content.parts &&
          Array.isArray(raw.candidates.content.parts) &&
          raw.candidates.content.parts &&
          raw.candidates.content.parts.text
        ) {
          document.getElementById('ai-result').innerText = raw.candidates.content.parts.text;
        } else {
          document.getElementById('ai-result').innerText = data.result; // fallback: show raw JSON
        }
      } catch (e) {
        document.getElementById('ai-result').innerText = data.result; // fallback on parse error
      }
    } else {
      document.getElementById('ai-result').innerText = "Unknown error from AI backend.";
    }
  } catch (e) {
    document.getElementById('ai-result').innerText = "Fetch error: " + e.message;
  }
};
