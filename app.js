// --- Enhanced Code ---

// It's best practice to get references to DOM elements once and reuse them.
const analyzeBtn = document.getElementById('analyze-btn');
const prodTitleInput = document.getElementById('prod-title');
const prodDescInput = document.getElementById('prod-desc');
const spinner = document.getElementById('eco-loading-spinner');
const resultDiv = document.getElementById('ai-result');

analyzeBtn.onclick = async function () {
  // Enhancement: Disable the button to prevent multiple submissions while processing.
  analyzeBtn.disabled = true;
  analyzeBtn.textContent = 'Analyzing...'; // Optional: Change button text

  // Show loading spinner and clear previous results.
  spinner.style.display = 'block';
  resultDiv.innerHTML = '';

  try {
    const title = prodTitleInput.value.trim();
    const desc = prodDescInput.value.trim();

    // User guidance for empty input.
    if (!title && !desc) {
      resultDiv.innerHTML = "<span style='color:#c00;'>Please enter a product title or description.</span>";
      // The 'finally' block will still run to re-enable the button.
      return; 
    }

    const response = await fetch('https://ecojinner.netlify.app/.netlify/functions/gemini-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description: desc }),
    });

    // Enhancement: Check for HTTP errors (e.g., 404, 500).
    // The `fetch` API does not throw an error for these, so we must check `response.ok`.
    if (!response.ok) {
      // Throw an error to be caught by the main catch block.
      throw new Error(`Server responded with status: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    let answer = '';

    // We expect `data.result` to be a stringified JSON from the backend.
    // This inner try/catch handles potential parsing errors of that specific string.
    try {
      const raw = JSON.parse(data.result);
      console.log("Gemini raw data.result:", raw); // For debugging.

      // Enhancement: Use Optional Chaining (?.) for safe and clean property access.
      // BUG FIX: The correct path is `raw.candidates[0]...`, not `raw.candidates...`
      const textPart = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
      const geminiError = raw?.error?.message;

      if (geminiError) {
        answer = `<span style="color:red;"><strong>Gemini Error:</strong> ${geminiError}</span>`;
      } else if (textPart) {
        answer = textPart;
      } else {
        answer = "Sorry, a valid response was not received from the AI. Please try rephrasing your input.";
      }
    } catch (e) {
      console.error("Error parsing backend data.result:", e);
      answer = "Sorry, the data from the backend was malformed. Please try again!";
    }

    // Use the `marked` library to parse Markdown in the answer.
    resultDiv.innerHTML = marked.parse(answer);

  } catch (e) {
    // This single catch block now handles network errors, HTTP errors, and other exceptions.
    console.error("Fetch or processing error:", e);
    resultDiv.innerHTML =
      `<span style="color: red;"><strong>Error:</strong> ${e.message}</span><br>` +
      `<span style="color: #666;">Please check your internet connection or try again soon.</span>`;
  } finally {
    // Enhancement: This `finally` block ensures the UI is always restored, even if an error occurs.
    spinner.style.display = 'none';
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = 'Analyze'; // Optional: Restore original button text
  }
};
