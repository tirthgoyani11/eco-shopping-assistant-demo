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
     let answer = "";
try {
  const raw = JSON.parse(data.result);
  if (
    raw.candidates &&
    Array.isArray(raw.candidates) &&
    raw.candidates &&
    raw.candidates.content &&
    Array.isArray(raw.candidates.content.parts) &&
    raw.candidates.content.parts &&
    typeof raw.candidates.content.parts.text === "string"
  ) {
    // This is the ONLY AI answer we want to display!
    answer = raw.candidates.content.parts.text;
  } else {
    answer = "Sorry, I couldn't extract a Gemini answer.";
  }
} catch (e) {
  answer = "Sorry, backend returned invalid data. Please try again!";
}
// SAFELY convert markdown and display as HTML
document.getElementById('ai-result').innerHTML = marked.parse(answer);
