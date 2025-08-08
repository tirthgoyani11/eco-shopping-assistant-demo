// --- Enhanced app.js ---
// This script assumes your HTML has elements with the following IDs:
// - analyze-btn, prod-title, prod-desc, eco-loading-spinner
// - ai-result-wrapper, ai-result, copy-btn
// - history-list, clear-history-btn, no-history

// It also assumes you have included the 'marked.js' library for Markdown parsing.
// <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

document.addEventListener('DOMContentLoaded', () => {
    // --- Get references to DOM elements ---
    const analyzeBtn = document.getElementById('analyze-btn');
    const prodTitleInput = document.getElementById('prod-title');
    const prodDescInput = document.getElementById('prod-desc');
    const spinner = document.getElementById('eco-loading-spinner');
    const resultWrapper = document.getElementById('ai-result-wrapper');
    const resultDiv = document.getElementById('ai-result');
    const copyBtn = document.getElementById('copy-btn');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const noHistoryMsg = document.getElementById('no-history');

    // --- Constants ---
    const HISTORY_KEY = 'ecoAnalyzerHistory';
    const MAX_HISTORY = 10;

    // --- History Management ---

    /**
     * Loads history from localStorage and populates the UI list.
     */
    function loadHistory() {
        // Clear the list but preserve the "no history" message element
        while (historyList.firstChild && historyList.firstChild !== noHistoryMsg) {
            historyList.removeChild(historyList.firstChild);
        }
        
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        
        if (history.length === 0) {
            if(noHistoryMsg) noHistoryMsg.style.display = 'list-item';
        } else {
            if(noHistoryMsg) noHistoryMsg.style.display = 'none';
            history.forEach(item => {
                const li = document.createElement('li');
                // Using classList for better class management
                li.classList.add('p-2', 'rounded-md', 'hover:bg-gray-100', 'cursor-pointer', 'text-sm');
                li.textContent = item.title.length > 40 ? item.title.substring(0, 40) + '...' : item.title;
                li.title = item.title; // Add full title on hover
                li.onclick = () => {
                    prodTitleInput.value = item.title;
                    prodDescInput.value = item.description;
                };
                // Insert new items before the "no history" message
                historyList.insertBefore(li, noHistoryMsg);
            });
        }
    }

    /**
     * Saves a new analysis to the history in localStorage.
     * @param {string} title - The product title.
     * @param {string} description - The product description.
     */
    function saveToHistory(title, description) {
        if (!title) return; // Don't save empty entries
        let history = JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
        // Remove any existing entry with the same title to avoid duplicates
        history = history.filter(item => item.title.toLowerCase() !== title.toLowerCase());
        // Add new item to the front
        history.unshift({ title, description });
        // Keep history to a maximum size
        if (history.length > MAX_HISTORY) {
            history = history.slice(0, MAX_HISTORY);
        }
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        loadHistory();
    }

    /**
     * Clears all history from localStorage and the UI.
     */
    if(clearHistoryBtn) {
        clearHistoryBtn.onclick = function() {
            localStorage.removeItem(HISTORY_KEY);
            loadHistory();
        };
    }


    // --- Core Application Logic ---

    if(analyzeBtn) {
        analyzeBtn.onclick = async function () {
            // 1. Set UI to loading state
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analyzing...';
            if(spinner) spinner.style.display = 'block';
            if(resultWrapper) resultWrapper.style.display = 'none';
            if(resultDiv) resultDiv.innerHTML = '';

            try {
                const title = prodTitleInput.value.trim();
                const desc = prodDescInput.value.trim();

                // User guidance for empty input.
                if (!title && !desc) {
                    if(resultWrapper) resultWrapper.style.display = 'block';
                    if(resultDiv) resultDiv.innerHTML = "<p class='text-red-600 font-semibold'>Please enter a product title or description.</p>";
                    // The 'finally' block will still run to re-enable the button.
                    return;
                }
                
                // Save to history before making the call
                saveToHistory(title, desc);

                // 2. Fetch analysis from the backend
                const response = await fetch('https://ecojinner.netlify.app/.netlify/functions/gemini-proxy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description: desc }),
                });

                // Check for HTTP errors (e.g., 404, 500).
                if (!response.ok) {
                    throw new Error(`Server responded with status: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();
                let answer = '';

                // 3. Parse the nested response from the backend
                try {
                    const raw = JSON.parse(data.result);
                    const textPart = raw?.candidates?.[0]?.content?.parts?.[0]?.text;
                    const geminiError = raw?.error?.message;

                    if (geminiError) {
                        answer = `<p class="text-red-600"><strong>Gemini Error:</strong> ${geminiError}</p>`;
                    } else if (textPart) {
                        answer = textPart;
                    } else {
                        answer = "<p>Sorry, a valid response was not received from the AI. Please try rephrasing your input.</p>";
                    }
                } catch (e) {
                    console.error("Error parsing backend data.result:", e);
                    answer = "<p>Sorry, the data from the backend was malformed. Please try again!</p>";
                }
                
                // 4. Display the result using the 'marked' library
                if(resultWrapper) resultWrapper.style.display = 'block';
                if(resultDiv && typeof marked !== 'undefined') {
                    resultDiv.innerHTML = marked.parse(answer);
                } else {
                    if(resultDiv) resultDiv.innerText = answer; // Fallback if marked.js is not available
                }

            } catch (e) {
                // This single catch block now handles network errors, HTTP errors, and other exceptions.
                console.error("Fetch or processing error:", e);
                if(resultWrapper) resultWrapper.style.display = 'block';
                if(resultDiv) {
                    resultDiv.innerHTML =
                        `<p class="text-red-600"><strong>Error:</strong> ${e.message}</p>` +
                        `<p class="text-gray-600 text-sm mt-1">Please check your internet connection or try again soon.</p>`;
                }
            } finally {
                // 5. Restore UI to its original state
                if(spinner) spinner.style.display = 'none';
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analyze';
            }
        };
    }


    // --- Utility Functions ---

    /**
     * Copies the text content of the result div to the clipboard.
     */
    if(copyBtn) {
        copyBtn.onclick = function() {
            // Use innerText to get the rendered text without HTML tags
            const textToCopy = resultDiv.innerText; 
            
            navigator.clipboard.writeText(textToCopy).then(() => {
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                    copyBtn.textContent = 'Copy';
                }, 2000); // Reset text after 2 seconds
            }).catch(err => {
                console.error('Failed to copy text: ', err);
                // A simple alert for feedback if the copy fails
                alert('Failed to copy text.'); 
            });
        };
    }

    // --- Initial Load ---
    loadHistory();
});
