// =================================================================
// Eco Jinner - The Definitive App Logic (app.js)
// =================================================================

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Element References ---
    const analyzeBtn = document.getElementById('analyze-btn');
    const analyzeBtnText = document.getElementById('analyze-btn-text');
    const btnSpinner = document.getElementById('btn-spinner');
    const prodTitleInput = document.getElementById('prod-title');
    const categorySelector = document.getElementById('category-selector');
    const categoryDisplay = document.getElementById('category-display');
    const placeholderContent = document.getElementById('placeholder-content');
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const resultContent = document.getElementById('result-content');

    let selectedCategory = null;

    // --- 2. UI Interaction Logic ---
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

    // --- 3. Core Analysis Function ---
    async function handleAnalysis() {
        const title = prodTitleInput.value.trim();
        if (!title) { alert("Please enter a product name."); return; }

        analyzeBtn.disabled = true;
        analyzeBtnText.textContent = 'Analyzing...';
        btnSpinner.classList.remove('hidden');
        placeholderContent.classList.add('hidden');
        resultContent.classList.add('hidden');
        loadingSkeleton.classList.remove('hidden');

        try {
            const response = await fetch('/.netlify/functions/gemini-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: selectedCategory, title, description: "" }),
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
                throw new Error(err.error || `An unknown server error occurred.`);
            }

            const data = await response.json();
            renderResults(data);

        } catch (e) {
            placeholderContent.innerHTML = `<p class="text-red-400 text-center"><strong>Request Failed:</strong><br>${e.message}</p>`;
            placeholderContent.classList.remove('hidden');
        } finally {
            analyzeBtn.disabled = false;
            analyzeBtnText.textContent = 'Analyze';
            btnSpinner.classList.add('hidden');
            loadingSkeleton.classList.add('hidden');
        }
    }

    analyzeBtn.addEventListener('click', handleAnalysis);
    prodTitleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAnalysis();
    });

    // --- 4. Results Rendering Function (BULLETPROOF VERSION) ---
    function renderResults(data) {
        // --- THIS IS THE FIX ---
        // First, check if the recommendations data exists and is a valid array.
        const recommendations = data.recommendations;
        const hasValidItems = recommendations && Array.isArray(recommendations.items) && recommendations.items.length > 0;

        let recommendationsHTML = '';
        if (hasValidItems) {
            recommendationsHTML = `
                <div class="reveal mt-6" style="transition-delay: 200ms;">
                    <h3 class="text-2xl font-bold text-white mb-4 ml-2">${recommendations.title}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${recommendations.items.map((item, index) => `
                            <div class="reveal recommendation-card glass-ui p-4 rounded-lg flex flex-col" style="transition-delay: ${300 + index * 100}ms;">
                                <img src="${item.image}" alt="${item.name}" class="w-full h-40 rounded-md mb-3" onerror="this.src='https://placehold.co/400x400/2c5364/e5e7eb?text=Image';">
                                <h4 class="font-bold text-white flex-grow">${item.name}</h4>
                                <p class="text-sm text-white/60 mb-3 flex-grow">${item.description}</p>
                                <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="mt-auto block text-center w-full bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-600 transition">
                                    View Product
                                </a>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        resultContent.innerHTML = `
            <div class="reveal glass-ui p-6 rounded-2xl">
                <div class="flex flex-col md:flex-row gap-6">
                    <div class="md:w-1/3 flex-shrink-0">
                        <img src="${data.productImage}" alt="${data.productName}" class="w-full rounded-lg shadow-lg" onerror="this.src='https://placehold.co/400x400/2c5364/e5e7eb?text=Image+Not+Found';">
                    </div>
                    <div class="md:w-2/3">
                        <h2 class="text-3xl font-bold text-white">${data.productName}</h2>
                        <p class="text-lg font-semibold ${data.isRecommended ? 'text-emerald-400' : 'text-red-400'} mb-4">${data.verdict}</p>
                        <div class="prose max-w-none text-white/80">${marked.parse(data.summary)}</div>
                    </div>
                </div>
            </div>
            ${recommendationsHTML}
        `;
        resultContent.classList.remove('hidden');
        
        setTimeout(() => {
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
        }, 10);
    }
});
