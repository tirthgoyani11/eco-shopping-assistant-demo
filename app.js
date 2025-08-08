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

    let answer = "";
    if (data.result) {
      try {
        // Debug log: you can remove this after testing!
        console.log("Gemini raw data.result:", data.result);

        const raw = JSON.parse(data.result);

        // If Gemini backend has an error field, show it plainly
        if (raw.error && raw.error.message) {
          answer = `<span style="color:red;"><strong>Gemini Error:</strong> ${raw.error.message}</span>`;
        } else if (
          raw.candidates &&
          Array.isArray(raw.candidates) &&
          raw.candidates[0] &&
          raw.candidates.content &&
          Array.isArray(raw.candidates.content.parts) &&
          raw.candidates.content.parts &&
          typeof raw.candidates.content.parts.text === "string" &&
          raw.candidates.content.parts.text.trim() !== ""
        ) {
          answer = raw.candidates.content.parts.text;
        } else {
          answer = "Sorry, I couldn't extract a Gemini answer. Please check spelling and try again!";
        }
      } catch (e) {
        answer = "Sorry, backend returned invalid data. Please try again!";
      }
    } else {
      answer = "Unknown error from AI backend.";
    }

    // Always render markdown safely
    document.getElementById('ai-result').innerHTML = marked.parse(answer);

  } catch (e) {
    document.getElementById('ai-result').innerHTML = `<span style="color: red;">Fetch error: ${e.message}</span>`;
  }
};
