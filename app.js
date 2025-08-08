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
      let answer = data.result;
      try {
        const raw = JSON.parse(data.result);
        if (
          raw.candidates &&
          Array.isArray(raw.candidates) &&
          raw.candidates[0] &&
          raw.candidates.content &&
          Array.isArray(raw.candidates.content.parts) &&
          raw.candidates.content.parts &&
          typeof raw.candidates.content.parts.text === "string"
        ) {
          answer = raw.candidates.content.parts.text;
        }
      } catch (e) {
        // leave answer as data.result on parse error
      }
      document.getElementById('ai-result').innerText = answer;
    } else {
      document.getElementById('ai-result').innerText = "Unknown error from AI backend.";
    }
  } catch (e) {
    document.getElementById('ai-result').innerText = "Fetch error: " + e.message;
  }
};
