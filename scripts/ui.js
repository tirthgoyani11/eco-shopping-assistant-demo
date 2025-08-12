// This module is responsible for all DOM manipulation and rendering of UI components.

/**
 * Renders the product results page with data from the AI analysis.
 * @param {HTMLElement} pageElement - The <section> element for the results page.
 * @param {object} product - The product data object.
 */
export function renderResults(pageElement, product) {
    pageElement.innerHTML = `
        <div class="results-content space-y-6">
            <div class="card-3d-wrapper">
                <div class="glass-card product-card p-4">
                    <img src="${product.image}" alt="${product.name}" class="rounded-2xl w-full h-48 object-cover mb-4">
                    <h2 class="text-2xl font-bold">${product.name}</h2>
                    <p class="text-gray-400">${product.brand}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="glass-card p-4 text-center">
                    <h3 class="font-bold text-gray-400 text-sm">Eco Score</h3>
                    <p class="text-5xl font-extrabold text-green-400">${product.ecoScore}</p>
                </div>
                <div class="glass-card p-4 text-center">
                    <h3 class="font-bold text-gray-400 text-sm">Carbon Footprint</h3>
                    <p class="text-3xl font-bold">${product.carbonFootprint} <span class="text-lg text-gray-500">kg CO₂</span></p>
                </div>
            </div>
            <div class="glass-card p-4">
                <h3 class="font-bold mb-3">Materials & Badges</h3>
                <div class="flex flex-wrap gap-2">
                    ${product.badges.map(badge => `<span class="badge bg-gray-700 text-gray-200">${badge}</span>`).join('')}
                </div>
            </div>
            <div>
                <h3 class="text-xl font-bold mb-3">Eco-Friendly Alternatives</h3>
                <div class="space-y-3">
                    ${product.alternatives.map(alt => `
                        <article class="glass-card p-3 flex items-center gap-4">
                            <img src="${alt.image}" class="w-16 h-16 rounded-xl object-cover">
                            <div class="flex-grow">
                                <p class="font-bold">${alt.name}</p>
                                <p class="text-sm text-gray-400">${alt.description}</p>
                            </div>
                            <button class="favorite-btn text-gray-600 hover:text-red-500 transition-colors" aria-label="Add to favorites">
                                <svg class="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"></path></svg>
                            </button>
                        </article>
                    `).join('')}
                </div>
            </div>
        </div>`;
}

/**
 * Renders the list of favorite items.
 * @param {HTMLElement} pageElement - The <section> element for the favorites page.
 * @param {Array<object>} favoritesData - The array of favorite items.
 */
export function renderFavorites(pageElement, favoritesData) {
    pageElement.innerHTML = `
        <h2 class="text-3xl font-bold mb-6">Favorites</h2>
        <div id="favorites-list" class="space-y-4">
            ${favoritesData.length > 0 ? favoritesData.map(item => `
                <article class="glass-card p-3 flex items-center gap-4">
                    <img src="${item.image}" class="w-16 h-16 rounded-xl object-cover">
                    <div class="flex-grow">
                        <p class="font-bold">${item.name}</p>
                        <div class="flex gap-2 mt-1">
                            <span class="badge-sm bg-green-900 text-green-300">Eco: ${item.ecoScore}</span>
                        </div>
                    </div>
                </article>
            `).join('') : '<p class="text-center text-gray-500">Your saved items will appear here.</p>'}
        </div>`;
}

/**
 * Renders the impact tracker page with stats and a chart.
 * @param {HTMLElement} pageElement - The <section> element for the impact page.
 * @param {object} impactData - The user's impact statistics.
 * @returns {string} The ID of the newly created canvas element for the chart.
 */
export function renderImpact(pageElement, impactData) {
    const chartId = `impact-chart-${Date.now()}`; // Unique ID to avoid Chart.js conflicts
    pageElement.innerHTML = `
        <h2 class="text-3xl font-bold mb-6">Your Impact</h2>
        <div class="grid grid-cols-1 gap-4">
            <div class="glass-card p-4">
                <h3 class="font-bold mb-2">Sustainable Choices</h3>
                <canvas id="${chartId}"></canvas>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="glass-card p-4">
                    <h3 class="font-bold">Items Scanned</h3>
                    <p class="text-4xl font-bold text-green-400">${impactData.scanned}</p>
                </div>
                <div class="glass-card p-4">
                    <h3 class="font-bold">Plastic Saved</h3>
                    <p class="text-4xl font-bold text-blue-400">${impactData.plasticSaved}<span class="text-lg"> items</span></p>
                </div>
            </div>
        </div>`;
    return chartId;
}

/**
 * Renders the learning hub with educational tips.
 * @param {HTMLElement} pageElement - The <section> element for the learning page.
 * @param {Array<object>} learningData - An array of learning tips.
 */
export function renderLearningHub(pageElement, learningData) {
    pageElement.innerHTML = `
        <h2 class="text-3xl font-bold mb-6">Learning Hub</h2>
        <div id="learning-carousel" class="space-y-4">
            ${learningData.map(card => `
                <article class="bg-gradient-to-br ${card.gradient} text-white rounded-2xl p-6 shadow-lg">
                    <h3 class="text-xl font-bold mb-2">${card.title}</h3>
                    <p>${card.content}</p>
                </article>
            `).join('')}
        </div>`;
}
