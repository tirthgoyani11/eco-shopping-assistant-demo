// --- Mock Data Module (ai.js) ---
const mockData = {
    product: { name: 'Organic Almond Milk', brand: 'EcoBrand Naturals', image: 'https://placehold.co/400x300/a3e635/4d7c0f?text=Almond+Milk', ecoScore: 'A', carbonFootprint: 1.2, badges: ['🌿 Organic', '♻️ Recyclable', '🐰 Cruelty-Free'], alternatives: [{ name: 'Oat Milk Powder', description: 'Just add water, less waste.', image: 'https://placehold.co/100x100/f0abfc/a21caf?text=Oat+Powder' }] },
    favorites: [{ name: 'Oat Milk Powder', image: 'https://placehold.co/100x100/f0abfc/a21caf?text=Oat+Powder', ecoScore: 'A' }, { name: 'Bamboo Toothbrush', image: 'https://placehold.co/100x100/67e8f9/0e7490?text=Toothbrush', ecoScore: 'A' }],
    impact: { scanned: 12, plasticSaved: 3, choices: { excellent: 5, good: 4, poor: 3 } },
    learning: [{ title: 'Did you know?', content: 'Reducing plastic use by just one bottle a week can save over 1,200 bottles from landfills in your lifetime.', gradient: 'from-green-400 to-blue-500' }, { title: 'Quick Tip', content: 'Opting for products with minimal packaging significantly reduces your carbon footprint.', gradient: 'from-purple-400 to-pink-500' }]
};
function getProductInfo(barcode) { return new Promise(resolve => setTimeout(() => resolve(mockData.product), 500)); }
function getFavorites() { return mockData.favorites; }
function getImpactData() { return mockData.impact; }
function getLearningTips() { return mockData.learning; }

// --- Camera Module (camera.js) ---
let cameraStream;
async function startCamera(videoEl) {
    if (cameraStream || !videoEl) return;
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoEl.srcObject = cameraStream;
    } catch (err) {
        console.error("Camera access denied:", err);
        document.getElementById('scanner-status').textContent = "Camera access denied.";
    }
}
function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
}

// --- Main Application Logic (app.js) ---
document.addEventListener('DOMContentLoaded', () => {
    const pages = { home: document.getElementById('page-home'), results: document.getElementById('page-results'), favorites: document.getElementById('page-favorites'), impact: document.getElementById('page-impact'), learn: document.getElementById('page-learn') };
    const navButtons = document.querySelectorAll('.nav-button');
    const scannerContainer = document.getElementById('scanner-container');
    const cameraFeedEl = document.getElementById('camera-feed');
    const scannerStatusEl = document.getElementById('scanner-status');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    let impactChartInstance;

    function showPage(pageId) {
        if (pageId !== 'home') {
            stopCamera();
        }
        Object.values(pages).forEach(page => page.classList.remove('active'));
        pages[pageId]?.classList.add('active');
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageId));

        if (pageId === 'home') {
            setTimeout(() => startCamera(cameraFeedEl), 100);
        } else if (pageId === 'favorites') {
            renderFavorites();
        } else if (pageId === 'impact') {
            renderImpact();
        } else if (pageId === 'learn') {
            renderLearningHub();
        }
    }

    navButtons.forEach(button => button.addEventListener('click', () => showPage(button.dataset.page)));

    async function handleScan() {
        scannerStatusEl.textContent = `Analyzing...`;
        stopCamera();
        const productInfo = await getProductInfo("simulated-scan");
        renderResults(productInfo);
        showPage('results');
    }
    
    scannerContainer.addEventListener('click', handleScan);

    function renderResults(product) {
        pages.results.innerHTML = `
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
    
    function renderFavorites() {
        const favorites = getFavorites();
        pages.favorites.innerHTML = `
            <h2 class="text-3xl font-bold mb-6">Favorites</h2>
            <div id="favorites-list" class="space-y-4">
                ${favorites.length > 0 ? favorites.map(item => `
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

    function renderImpact() {
        const data = getImpactData();
        pages.impact.innerHTML = `
            <h2 class="text-3xl font-bold mb-6">Your Impact</h2>
            <div class="grid grid-cols-1 gap-4">
                <div class="glass-card p-4">
                    <h3 class="font-bold mb-2">Sustainable Choices</h3>
                    <canvas id="impact-chart"></canvas>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="glass-card p-4">
                        <h3 class="font-bold">Items Scanned</h3>
                        <p class="text-4xl font-bold text-green-400">${data.scanned}</p>
                    </div>
                    <div class="glass-card p-4">
                        <h3 class="font-bold">Plastic Saved</h3>
                        <p class="text-4xl font-bold text-blue-400">${data.plasticSaved}<span class="text-lg"> items</span></p>
                    </div>
                </div>
            </div>`;
        const ctx = document.getElementById('impact-chart').getContext('2d');
        if (impactChartInstance) impactChartInstance.destroy();
        Chart.defaults.color = '#9ca3af';
        impactChartInstance = new Chart(ctx, { 
            type: 'doughnut', 
            data: { 
                labels: ['Excellent', 'Good', 'Poor'], 
                datasets: [{ 
                    data: [data.choices.excellent, data.choices.good, data.choices.poor], 
                    backgroundColor: ['#22c55e', '#84cc16', '#ef4444'], 
                    borderColor: '#1f2937', 
                    borderWidth: 4 
                }] 
            }, 
            options: { 
                responsive: true, 
                cutout: '70%', 
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { color: '#9ca3af' } 
                    } 
                } 
            } 
        });
    }

    function renderLearningHub() {
        const tips = getLearningTips();
        pages.learn.innerHTML = `
            <h2 class="text-3xl font-bold mb-6">Learning Hub</h2>
            <div id="learning-carousel" class="space-y-4">
                ${tips.map(card => `
                    <article class="bg-gradient-to-br ${card.gradient} text-white rounded-2xl p-6 shadow-lg">
                        <h3 class="text-xl font-bold mb-2">${card.title}</h3>
                        <p>${card.content}</p>
                    </article>
                `).join('')}
            </div>`;
    }

    uploadBtn.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', async (event) => {
        if (event.target.files[0]) {
            scannerStatusEl.textContent = `Processing ${event.target.files[0].name}...`;
            const productInfo = await getProductInfo('uploaded-image');
            renderResults(productInfo);
            showPage('results');
        }
    });

    showPage('home');
});
