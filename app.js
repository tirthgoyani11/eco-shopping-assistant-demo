document.getElementById('analyze-btn').onclick = async function () {
  const title = document.getElementById('prod-title').value.trim();
  const desc = document.getElementById('prod-desc').value.trim();

  // User guidance for empty input
  if (!title && !desc) {
    document.getElementById('ai-result').innerHTML = "<span style='color:#c00;'>Please enter a product title or description.</span>";
    return;
  }
  document.getElementById('ai-result').innerHTML = "<em>Analyzing via Gemini...</em>";

  try {
    const response = await fetch('https://ecojinner.netlify.app/.netlify/functions/gemini-proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description: desc }),
    });
    const data = await response.json();

    let answer = "";
    try {
      const raw = JSON.parse(data.result);
      // Developer debug: remove this line when you're live!
      console.log("Gemini raw data.result:", raw);

      // If Gemini returns an error field, show it to the user
      if (raw.error && raw.error.message) {
        answer = `<span style="color:red;"><strong>Gemini Error:</strong> ${raw.error.message}</span>`;
      }
      // Try to robustly extract answer (using array indices!)
      else if (
        raw.candidates &&
        Array.isArray(raw.candidates) &&
        raw.candidates[0] &&
        raw.candidates.content &&
        Array.isArray(raw.candidates.content.parts)
      ) {
        // Get the first non-empty part with text (in case model changes)
        const part = raw.candidates.content.parts.find(
          p => typeof p.text === "string" && p.text.trim() !== ""
        );
        if (part) {
          answer = part.text;
        } else {
          answer = "Gemini did not return an answer. Try using more details, e.g. 'organic cotton shirt' or 'reusable plastic bottle'.";
        }
      } else {
        answer = "Sorry, I couldn't extract a Gemini answer. Please check spelling and try again!";
      }
    } catch (e) {
      answer = "Sorry, backend returned invalid data. Please try again!";
    }

    // Always render markdown so output is formatted
    document.getElementById('ai-result').innerHTML = marked.parse(answer);

  } catch (e) {
    document.getElementById('ai-result').innerHTML =
      `<span style="color: red;">Fetch error: ${e.message}</span><br>` +
      `<span style="color: #666;">Please check your internet connection or re-try soon.</span>`;
  }
};
