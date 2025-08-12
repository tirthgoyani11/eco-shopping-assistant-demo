/**
 * Renders the product results page with data from the AI analysis.
 * @param {HTMLElement} pageElement - The <section> element for the results page.
 * @param {object} product - The product data object from the AI.
 */
export function renderResults(pageElement, product) {
    const productCardHTML = `
        <div class="card-3d-wrapper">
            <div class="glass-card product-card p-4">
                <img src="${product.image}" alt="${product.name}" class="rounded-2xl w-full h-48 object-cover mb-4">
                <h2 class="text-2xl font-bold">${product.name}</h2>
                <p class="text-gray-400">${product.brand}</p>
            </div>
        </div>`;

    let analysisHTML = '';
    if (product.product_category === 'Food' && product.health_analysis) {
        analysisHTML = `
            <div class="glass-card p-4">
                <h3 class="font-bold mb-3">Health Analysis</h3>
                <div class="flex items-center gap-4">
                    <span class="badge ${product.health_analysis.rating === 'Healthy' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}">${product.health_analysis.rating}</span>
                    <div class="text-sm">
                        <p class="text-gray-300">${product.health_analysis.health_concern || ''}</p>
                        <p class="text-gray-400">${product.health_analysis.sufficient_intake || ''}</p>
                    </div>
                </div>
            </div>`;
    } else {
        analysisHTML = `
            <div class="grid grid-cols-2 gap-4">
                <div class="glass-card p-4 text-center"><h3 class="font-bold text-gray-400 text-sm">Eco Score</h3><p class="text-5xl font-extrabold text-green-400">${product.ecoScore || 'N/A'}</p></div>
                <div class="glass-card p-4 text-center"><h3 class="font-bold text-gray-400 text-sm">Carbon Footprint</h3><p class="text-3xl font-bold">${product.carbonFootprint || 0} <span class="text-lg text-gray-500">kg CO₂</span></p></div>
            </div>`;
    }
    
    const alternativesHTML = `
        <div>
            <h3 class="text-xl font-bold mb-3">SCOUT Bot Alternatives</h3>
            <div class="space-y-3">
                ${(product.alternatives || []).map(alt => {
                    if (alt.recipe || alt.diy_instructions) {
                        const instructions = alt.recipe || alt.diy_instructions;
                        return `
                            <article class="glass-card p-4 recipe-card">
                                <p class="font-bold text-lg">${alt.name}</p>
                                <p class="text-sm text-gray-400 mb-2">${alt.reason}</p>
                                <ol class="text-sm list-decimal space-y-1">
                                    ${instructions.map(step => `<li>${step}</li>`).join('')}
                                </ol>
                            </article>`;
                    }
                    let actionButton = '';
                    if (alt.link) {
                        actionButton = `<a href="${alt.link}" target="_blank" class="action-button">Buy</a>`;
                    } else if (alt.search_query) {
                        actionButton = `<a href="https://www.google.com/search?tbm=shop&q=${encodeURIComponent(alt.search_query)}" target="_blank" class="action-button search">Search</a>`;
                    }
                    return `
                        <article class="glass-card p-3 flex items-center gap-4">
                            <div class="flex-grow">
                                <p class="font-bold">${alt.name}</p>
                                <p class="text-sm text-gray-400">${alt.reason}</p>
                            </div>
                            ${actionButton}
                        </article>`;
                }).join('')}
            </div>
        </div>`;

    pageElement.innerHTML = `<div class="results-content space-y-6 pb-6">${productCardHTML}${analysisHTML}${alternativesHTML}</div>`;
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
    const chartId = `impact-chart-${Date.now()}`;
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
