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
try {
  const raw = JSON.parse(data.result);
  // Debug log for developer, safe to remove later
  console.log("Gemini raw data.result:", raw);

  // Try to extract answer from proper location
  if (
    raw.candidates &&
    Array.isArray(raw.candidates) &&
    raw.candidates &&
    raw.candidates.content &&
    Array.isArray(raw.candidates.content.parts) &&
    raw.candidates.content.parts &&
    typeof raw.candidates.content.parts.text === "string"
  ) {
    answer = raw.candidates.content.parts.text;
  } else {
    answer = "Sorry, I couldn't extract a Gemini answer. Please check spelling and try again!";
  }
} catch (e) {
  answer = "Sorry, backend returned invalid data. Please try again!";
}
document.getElementById('ai-result').innerHTML = marked.parse(answer);

  }
};
