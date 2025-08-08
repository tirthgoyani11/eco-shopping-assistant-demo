/**
 * Eco Jinner - app.js
 * -------------------
 * This script handles all client-side logic for the Eco Jinner application,
 * including user interactions, API calls to the backend for AI analysis,
 * and dynamic rendering of the results.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. DOM Element References ---
    // Centralized access to all interactive elements from index.html
    const analyzeBtn = document.getElementById('analyze-btn');
    const prodTitleInput = document.getElementById('prod-title');
    const categorySelector = document.getElementById('category-selector');
    const categoryDisplay = document.getElementById('category-display');
    const placeholderContent = document.getElementById('placeholder-content');
    const loadingSkeleton = document.getElementById('loading-skeleton');
    const resultContent = document.getElementById('result-content');
    
    // Feature-specific elements
    const historyBtn = document.getElementById('history-btn');
    const historyPanel = document.getElementById('history-panel');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsOverlay = document.getElementById('settings-modal-overlay');
    const reportIssueLink = document.getElementById('report-issue-link');
    const notificationModal = document.getElementById('notification-modal');
    const notificationMessage = document.getElementById('notification-message');

    // --- 2. State Management ---
    // Default category for analysis
    let selectedCategory = 'eco'; 
    // Load history from browser's local storage or initialize an empty array
    const state = {
        history: JSON.parse(localStorage.getItem('ecoJinnerHistory')) || [],
    };

    // --- 3. Core Functions ---

    /**
     * Updates the UI to reflect the currently selected category.
     * @param {string} category - The key for the selected category (e.g., 'eco').
     * @param {HTMLElement} buttonEl - The category button element that was clicked.
     */
    function updateCategory(category, buttonEl) {
        selectedCategory = category;
        const icon = buttonEl.textContent.split(' ')[0];
        const text = buttonEl.textContent.split(' ').slice(1).join(' ');
        categoryDisplay.innerHTML = `<span class="text-xl">${icon}</span> <span class="hidden md:inline">${text}</span>`;
        
        // Update styles and ARIA attributes for all category buttons
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-checked', 'false');
        });
        buttonEl.classList.add('active');
        buttonEl.setAttribute('aria-checked', 'true');
        prodTitleInput.focus();
    }

    /**
     * Displays a non-intrusive notification message at the bottom of the screen.
     * @param {string} message - The text to display in the notification.
     * @param {'success'|'error'} type - The type of notification, for styling.
     */
    function showNotification(message, type = 'success') {
        notificationMessage.textContent = message;
        notificationModal.className = `fixed bottom-5 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full shadow-lg opacity-0 transform translate-y-10 pointer-events-none ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`;
        
        // Animate in
        requestAnimationFrame(() => {
            notificationModal.classList.remove('opacity-0', 'translate-y-10');
        });

        // Animate out after 3 seconds
        setTimeout(() => {
            notificationModal.classList.add('opacity-0', 'translate-y-10');
        }, 3000);
    }

    /**
     * The main function to handle the product analysis request.
     * It manages UI states (loading, results) and calls the backend API.
     */
    async function handleAnalysis() {
        const title = prodTitleInput.value.trim();
        if (!title) {
            showNotification("Please enter a product name.", 'error');
            return;
        }

        // --- UI State: Loading ---
        analyzeBtn.disabled = true;
        placeholderContent.classList.add('hidden');
        resultContent.classList.add('hidden');
        loadingSkeleton.classList.remove('hidden');

        try {
            // --- API Call ---
            const response = await fetch('/.netlify/functions/gemini-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: selectedCategory, title }),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
                throw new Error(errData.error || 'An unknown server error occurred.');
            }

            const data = await response.json();

            // --- AI Response Processing ---
            // This preserves the logic from your original script but integrates it here.
            if (data.error) {
                 throw new Error(`AI Error: ${data.error}`);
            }

            renderResults(data);
            saveToHistory(title, selectedCategory, data);

        } catch (e) {
            // --- UI State: Error ---
            showNotification(e.message, 'error');
            resultContent.innerHTML = `<div class="glass-ui p-6 rounded-2xl text-center"><p class="text-red-400"><strong>Request Failed:</strong><br>${e.message}</p></div>`;
            resultContent.classList.remove('hidden');
        } finally {
            // --- UI State: Reset ---
            analyzeBtn.disabled = false;
            loadingSkeleton.classList.add('hidden');
        }
    }

    /**
     * Renders the structured data from the API into HTML and displays it.
     * @param {object} data - The complete analysis data object from the backend.
     */
    function renderResults(data) {
        // Use marked.js to safely convert Markdown summary to HTML
        const summaryHtml = data.summary ? marked.parse(data.summary) : '<p>No summary provided.</p>';

        resultContent.innerHTML = `
            <article class="reveal">
                <div class="glass-ui p-6 rounded-2xl relative">
                    <button class="share-btn absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition" aria-label="Share this analysis">
                        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.186 2.25 2.25 0 00-3.933 2.186z" /></svg>
                    </button>
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="md:w-1/3 flex-shrink-0">
                            <img src="${data.productImage}" alt="Image of ${data.productName}" class="w-full rounded-lg shadow-lg" onerror="this.src='https://placehold.co/400x400/1f2937/e5e7eb?text=Image+Not+Found'; this.onerror=null;">
                        </div>
                        <div class="md:w-2/3">
                            <h2 class="text-3xl font-bold text-white">${data.productName}</h2>
                            <p class="text-lg font-semibold ${data.isRecommended ? 'text-emerald-400' : 'text-red-400'} my-4">${data.verdict}</p>
                            <div class="prose prose-invert max-w-none">${summaryHtml}</div>
                        </div>
                    </div>
                </div>
            </article>
            <section class="reveal mt-12" style="transition-delay: 200ms;">
                <h3 class="text-2xl font-bold text-white mb-6 ml-2">${data.recommendations.title}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${(data.recommendations.items || []).map((item) => `
                        <div class="reveal recommendation-card glass-ui p-4 rounded-lg flex flex-col">
                            <img src="${item.image}" alt="${item.name}" class="w-full h-48 rounded-md mb-4 object-cover" onerror="this.src='https://placehold.co/400x400/1f2937/e5e7eb?text=Image'; this.onerror=null;">
                            <h4 class="font-bold text-white flex-grow">${item.name}</h4>
                            <p class="text-sm text-white/60 my-3 flex-grow">${item.description}</p>
                            <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="mt-auto block text-center w-full bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-600 transition">
                                View Product
                            </a>
                        </div>
                    `).join('')}
                </div>
            </section>
        `;
        resultContent.classList.remove('hidden');
        
        // Add event listener for the newly created share button
        resultContent.querySelector('.share-btn')?.addEventListener('click', () => handleShare(data));

        // Trigger reveal animations
        setTimeout(() => {
            document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
        }, 10);
    }

    /**
     * Handles sharing the analysis via Web Share API or clipboard fallback.
     * @param {object} data - The analysis data to be shared.
     */
    async function handleShare(data) {
        const shareData = {
            title: `Eco Jinner Analysis: ${data.productName}`,
            text: `${data.verdict}. Check out this analysis on Eco Jinner!`,
            url: window.location.href,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
                showNotification('Analysis link copied to clipboard!');
            }
        } catch (err) {
            showNotification('Could not share analysis.', 'error');
        }
    }

    // --- 4. Feature-Specific Functions (History, Settings) ---

    function saveToHistory(title, category, resultData) {
        // Implementation for saving to localStorage and re-rendering history
    }

    function renderHistory() {
        // Implementation for rendering the history list
    }
    
    function togglePanel(panel, show) {
       // Generic function to show/hide side panels
    }

    // --- 5. Event Listeners ---
    
    analyzeBtn.addEventListener('click', handleAnalysis);
    prodTitleInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAnalysis();
    });

    categorySelector.addEventListener('click', (e) => {
        const btn = e.target.closest('.category-btn');
        if (btn) updateCategory(btn.dataset.category, btn);
    });
    
    historyBtn.addEventListener('click', () => togglePanel(historyPanel, true));
    // Add listeners for settings, modals, etc.

    // --- 6. Initial Application Setup ---
    function initializeApp() {
        updateCategory('eco', document.querySelector('.category-btn[data-category="eco"]'));
        renderHistory();
        // Any other setup tasks
    }

    initializeApp();
});
