/**
 * app.js for Eco Jinner
 * This script is updated to work with the advanced, multi-step gemini-proxy.js.
 * It sends a simple request and is designed to render the rich, fully-assembled
 * JSON object that the new proxy returns.
 */
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Element References ---
  const analyzeBtn = document.getElementById('analyze-btn');
  const prodTitleInput = document.getElementById('prod-title');
  const categorySelector = document.getElementById('category-selector');
  const categoryDisplay = document.getElementById('category-display');
  const placeholderContent = document.getElementById('placeholder-content');
  const loadingSkeleton = document.getElementById('loading-skeleton');
  const resultContent = document.getElementById('result-content');
  const analyzeIcon = document.getElementById('analyze-icon');
  const analyzeSpinner = document.getElementById('analyze-spinner');
  let selectedCategory = null;

  // --- Category Management ---
  function updateCategory(category, buttonEl) {
    selectedCategory = category;
    const icon = buttonEl.textContent.split(' ')[0];
    const text = buttonEl.textContent.split(' ').slice(1).join(' ');
    categoryDisplay.innerHTML = `<span class="text-xl">${icon}</span> <span class="hidden md:inline">${text}</span>`;

    document.querySelectorAll('.category-btn').forEach(btn => {
      btn.classList.remove('bg-emerald-500/50', 'border-emerald-400');
    });
    buttonEl.classList.add('bg-emerald-500/50', 'border-emerald-400');
    prodTitleInput.focus();
  }
  categorySelector.addEventListener('click', (e) => {
    const btn = e.target.closest('.category-btn');
    if (btn) {
      updateCategory(btn.dataset.category, btn);
    }
  });

  updateCategory('eco', document.querySelector('.category-btn[data-category="eco"]'));

  // --- UI State Management ---
  function setButtonLoading(isLoading) {
    analyzeBtn.disabled = isLoading;
    if (isLoading) {
      if (analyzeIcon) analyzeIcon.classList.add('hidden');
      if (analyzeSpinner) analyzeSpinner.classList.remove('hidden');
    } else {
      if (analyzeIcon) analyzeIcon.classList.remove('hidden');
      if (analyzeSpinner) analyzeSpinner.classList.add('hidden');
    }
  }
  function showLoadingState() {
    setButtonLoading(true);
    placeholderContent.classList.add('hidden');
    resultContent.classList.add('hidden');
    loadingSkeleton.classList.remove('hidden');
    resultContent.innerHTML = '';
  }
  function hideLoadingState() {
    setButtonLoading(false);
    loadingSkeleton.classList.add('hidden');
  }

  // --- Core Analysis Logic ---
  async function handleAnalysis() {
    const title = prodTitleInput.value.trim();
    if (!title) {
      alert("Please enter a product name to analyze.");
      return;
    }
    if (!selectedCategory) {
      alert("Please select a category.");
      return;
    }
    showLoadingState();

    try {
      const response = await fetch('/.netlify/functions/gemini-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: selectedCategory,
          title: title,
        }),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseErr) {
        throw new Error(`Failed to parse JSON response: ${parseErr.message}`);
      }

      if (!response.ok) {
        // Show error from proxy if available
        let errMsg = "Request failed.";
        if (data && typeof data.error === 'string') {
          errMsg = data.error;
        } else if (data && typeof data === 'string') {
          errMsg = data;
        } else if (response.status === 403) {
          errMsg = "API Error 403: Forbidden – check API key, endpoint permissions, and quota.";
        } else if (response.status === 500) {
          errMsg = "Internal Server Error – check proxy function logs for details.";
        } else {
          errMsg = `API Error: ${response.status}`;
        }
        throw new Error(errMsg);
      }

      // The new proxy returns the final JSON directly. No extra parsing is needed.
      renderResults(data);
    } catch (e) {
      console.error("Analysis Error:", e);
      placeholderContent.innerHTML =
        `<p class="text-red-400 text-center">
          <strong>Request Failed:</strong><br>
          ${e.message}
         </p>`;
      placeholderContent.classList.remove('hidden');
      resultContent.classList.add('hidden');
      loadingSkeleton.classList.add('hidden');
    } finally {
      hideLoadingState();
    }
  }

  // --- Event Listeners ---
  analyzeBtn.addEventListener('click', handleAnalysis);
  prodTitleInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAnalysis();
    }
  });

  // --- Rendering Logic ---
  /**
   * Renders the final analysis results into the DOM.
   * This function is updated to handle the new data structure from the advanced proxy.
   * @param {object} data - The fully assembled JSON object from the AI proxy.
   */
  function renderResults(data) {
    const verdictColor = data.isRecommended ? 'text-emerald-400' : 'text-red-400';
    // This now uses item.image, which is provided by the proxy.
    const recommendationsHtml = data.recommendations.items.map((item, index) => `
      <div class="reveal recommendation-card glass-ui p-4 rounded-lg flex flex-col" style="transition-delay: ${400 + index * 100}ms;">
        <img src="${item.image}" alt="${item.name}" class="w-full h-40 rounded-md mb-3 object-cover" onerror="this.src='https://placehold.co/400x400/2c5364/e5e7eb?text=Image'; this.onerror=null;">
        <h4 class="font-bold text-white flex-grow">${item.name}</h4>
        <p class="text-sm text-white/60 mb-3 flex-grow">${item.description}</p>
        <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="mt-auto block text-center w-full bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-600 transition">
          Find Out More
        </a>
      </div>
    `).join('');

    const feedbackHtml = `
      <div class="mt-6 pt-6 border-t border-white/10 text-center">
        <h3 class="text-lg font-semibold text-white mb-3">Was this analysis helpful?</h3>
        <div id="feedback-section">
          <div class="star-rating flex flex-row-reverse justify-center text-4xl text-slate-600 mb-4">
            <input type="radio" id="star5" name="rating" value="5" aria-label="5 stars"/><label for="star5" title="5 stars">★</label>
            <input type="radio" id="star4" name="rating" value="4" aria-label="4 stars"/><label for="star4" title="4 stars">★</label>
            <input type="radio" id="star3" name="rating" value="3" aria-label="3 stars"/><label for="star3" title="3 stars">★</label>
            <input type="radio" id="star2" name="rating" value="2" aria-label="2 stars"/><label for="star2" title="2 stars">★</label>
            <input type="radio" id="star1" name="rating" value="1" aria-label="1 star"/><label for="star1" title="1 star">★</label>
          </div>
          <div id="feedback-thanks" class="text-center text-emerald-400 font-semibold hidden">
            Thank you for your feedback!
          </div>
        </div>
      </div>
    `;
    // The main result now includes the `productImage`.
    resultContent.innerHTML = `
      <div class="reveal glass-ui p-6 rounded-2xl" style="transition-delay: 100ms;">
        <div class="flex flex-col md:flex-row gap-6">
          <div class="md:w-1/3 flex-shrink-0">
            <img src="${data.productImage}" alt="${data.productName}" class="w-full rounded-lg shadow-lg object-cover aspect-square" onerror="this.src='https://placehold.co/400x400/2c5364/e5e7eb?text=Image+Not+Found'; this.onerror=null;">
          </div>
          <div class="md:w-2/3">
            <h2 class="text-3xl font-bold text-white">${data.productName}</h2>
            <p class="text-lg font-semibold ${verdictColor} mb-4">${data.verdict}</p>
            <div class="prose max-w-none text-white/80">${marked.parse(data.summary)}</div>
          </div>
        </div>
        ${feedbackHtml}
      </div>
      <div class="reveal mt-8" style="transition-delay: 300ms;">
        <h3 class="text-2xl font-bold text-white mb-4 ml-2">${data.recommendations.title}</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${recommendationsHtml}
        </div>
      </div>
    `;
    resultContent.classList.remove('hidden');

    setTimeout(() => {
      document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
    }, 10);
    const feedbackSection = document.getElementById('feedback-section');
    if (feedbackSection) {
      feedbackSection.querySelectorAll('.star-rating input').forEach(star => {
        star.addEventListener('change', () => {
          document.getElementById('feedback-thanks').classList.remove('hidden');
          feedbackSection.querySelector('.star-rating').classList.add('hidden');
        });
      });
    }
  }
});
