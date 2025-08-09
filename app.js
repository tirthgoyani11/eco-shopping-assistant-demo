/**
 * =================================================================
 * EcoGenie - Definitive Application Logic (with Borealis 3D Wave)
 * =================================================================
 * This script has been rebuilt from scratch for maximum reliability and performance.
 * It features a new, advanced "Borealis Particle Wave" 3D background.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. INITIALIZATION & SETUP ---

    const elements = {
        // Navigation & Pages
        navLinks: document.querySelectorAll('.nav-link, .mobile-nav-link'),
        pageContents: document.querySelectorAll('.page-content'),
        mainContent: document.getElementById('main-content'),
        
        // Core Analysis UI
        analyzeBtn: document.getElementById('analyze-btn'),
        prodTitleInput: document.getElementById('prod-title'),
        categorySelector: document.getElementById('category-selector'),
        categoryDisplay: document.getElementById('category-display'),
        resultContainer: document.getElementById('result-container'),
        placeholderContent: document.getElementById('placeholder-content'),
        loadingAnimation: document.getElementById('loading-animation'),
        resultContent: document.getElementById('result-content'),
        
        // Panels & Modals
        historyBtn: document.getElementById('history-btn'),
        historyPanel: document.getElementById('history-panel'),
        closeHistoryBtn: document.getElementById('close-history-btn'),
        clearHistoryBtn: document.getElementById('clear-history-btn'),
        historyList: document.getElementById('history-list'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        closeMobileMenuBtn: document.getElementById('close-mobile-menu-btn'),
        mobileMenu: document.getElementById('mobile-menu'),
        notificationModal: document.getElementById('notification-modal'),
        notificationMessage: document.getElementById('notification-message'),
        confirmModal: document.getElementById('confirm-modal'),
        confirmModalOverlay: document.getElementById('confirm-modal-overlay'),
        confirmModalCancel: document.getElementById('confirm-modal-cancel'),
        confirmModalConfirm: document.getElementById('confirm-modal-confirm'),

        // Discover Page
        discoverGrid: document.getElementById('discover-grid'),

        // Learn Page
        learnListView: document.getElementById('learn-list-view'),
        learnArticleView: document.getElementById('learn-article-view'),
        articleListContainer: document.getElementById('article-list-container'),
        
        // New Feature Elements
        impactTrackerContainer: document.getElementById('impact-tracker'), 
    };

    const state = {
        currentCategory: 'eco',
        history: JSON.parse(localStorage.getItem('ecoGenieHistory')) || [],
        favorites: JSON.parse(localStorage.getItem('ecoGenieFavorites')) || [],
        impactStats: JSON.parse(localStorage.getItem('ecoGenieImpact')) || { analyses: 0, discoveries: 0 },
        discover: { products: [], loaded: false },
        learn: { articles: [], loaded: false },
        currentAnalysisData: null,
    };

    // --- 2. NEW 3D BACKGROUND ENGINE: "BOREALIS PARTICLE WAVE" ---

    const init3DBackground = () => {
        if (typeof THREE === 'undefined') return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.position.z = 30;

        const particleCount = 10000;
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        const color = new THREE.Color();
        const radius = 50;

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * radius;
            positions[i3 + 1] = (Math.random() - 0.5) * radius;
            positions[i3 + 2] = (Math.random() - 0.5) * radius;
            
            color.setHSL(0.5 + Math.random() * 0.2, 0.7, 0.5 + Math.random() * 0.2);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;

            sizes[i] = Math.random() * 2 + 1;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 1.0 },
                pointTexture: { value: new THREE.TextureLoader().load( 'https://threejs.org/examples/textures/sprites/spark1.png' ) }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
                    gl_PointSize = size * ( 300.0 / -mvPosition.z );
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform sampler2D pointTexture;
                varying vec3 vColor;
                void main() {
                    gl_FragColor = vec4( vColor, 1.0 );
                    gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
                }
            `,
            blending: THREE.AdditiveBlending,
            depthTest: false,
            transparent: true
        });

        const particleSystem = new THREE.Points(geometry, material);
        scene.add(particleSystem);

        const mouse = new THREE.Vector2();
        document.addEventListener('mousemove', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
        
        const clock = new THREE.Clock();
        const animate = () => {
            requestAnimationFrame(animate);
            const elapsedTime = clock.getElapsedTime();
            
            particleSystem.rotation.y = elapsedTime * 0.05;
            
            const positions = particleSystem.geometry.attributes.position.array;
            for (let i = 0; i < particleCount; i++) {
                const i3 = i * 3;
                const x = positions[i3];
                const y = positions[i3 + 1];
                positions[i3 + 1] = Math.sin(elapsedTime + x * 0.5) * 2.0;
            }
            particleSystem.geometry.attributes.position.needsUpdate = true;

            camera.position.x += (mouse.x * 5 - camera.position.x) * 0.02;
            camera.position.y += (mouse.y * 5 - camera.position.y) * 0.02;
            camera.lookAt(scene.position);

            renderer.render(scene, camera);
        };
        animate();

        window.addEventListener('resize', () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        });
    };
    
    // --- 3. UI & UTILITY FUNCTIONS ---
    const togglePanel = (panel, show) => {
        if (show) panel.classList.remove('translate-x-full');
        else panel.classList.add('translate-x-full');
    };

    const toggleModal = (modal, show) => {
        const overlay = document.getElementById(modal.id + '-overlay');
        if (show) {
            modal.classList.remove('hidden');
            overlay?.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
            overlay?.classList.add('hidden');
        }
    };

    const showNotification = (message, type = 'success') => {
        elements.notificationMessage.textContent = message;
        elements.notificationModal.className = `fixed bottom-5 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full shadow-lg opacity-0 transform translate-y-10 pointer-events-none ${type === 'success' ? 'bg-teal-500' : 'bg-red-500'}`;
        requestAnimationFrame(() => elements.notificationModal.classList.remove('opacity-0', 'translate-y-10'));
        setTimeout(() => elements.notificationModal.classList.add('opacity-0', 'translate-y-10'), 3000);
    };
    
    const renderLoadingState = (container, text = "Loading...") => {
        container.innerHTML = `<div class="loader-container py-20 col-span-full"><div class="glitch-text" data-text="${text}"></div></div>`;
    };

    const renderErrorState = (container, message) => {
        container.innerHTML = `<p class="text-red-400 text-center col-span-full">${message}</p>`;
    };

    // --- 4. NAVIGATION & PAGE MANAGEMENT ---
    const showPage = (pageId) => {
        elements.pageContents.forEach(page => page.classList.add('hidden'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.remove('hidden');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active-link', link.getAttribute('href') === `#${pageId}`);
        });
        
        if (pageId === 'discover' && !state.discover.loaded) loadDiscoverContent();
        if (pageId === 'learn' && !state.learn.loaded) loadLearnContent();
        
        if (pageId === 'learn') {
            elements.learnListView.classList.remove('hidden');
            elements.learnArticleView.classList.add('hidden');
        }

        togglePanel(elements.mobileMenu, false);
        window.scrollTo(0, 0);
    };

    // --- 5. CORE AI & API LOGIC ---
    const fetchFromApi = async (functionName, body) => {
        for (let i = 0; i < 3; i++) {
            try {
                const response = await fetch(`/.netlify/functions/${functionName}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
                    throw new Error(errData.error || 'An unknown server error occurred.');
                }
                return await response.json();
            } catch (error) {
                if (i === 2) throw error;
                await new Promise(res => setTimeout(res, 1000 * (i + 1)));
            }
        }
    };

    // --- 6. HOME PAGE: PRODUCT ANALYSIS ---
    const updateCategory = (category, buttonEl) => {
        state.currentCategory = category;
        const icon = buttonEl.textContent.split(' ')[0];
        const text = buttonEl.textContent.split(' ').slice(1).join(' ');
        elements.categoryDisplay.innerHTML = `<span class="text-xl">${icon}</span> <span class="hidden md:inline">${text}</span>`;
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active', 'border-teal-400');
            btn.setAttribute('aria-checked', 'false');
        });
        buttonEl.classList.add('active', 'border-teal-400');
        buttonEl.setAttribute('aria-checked', 'true');
        elements.prodTitleInput.focus();
    };

    const handleAnalysis = async () => {
        const title = elements.prodTitleInput.value.trim();
        if (!title) {
            showNotification("Please enter a product name.", 'error');
            return;
        }
        elements.analyzeBtn.disabled = true;
        elements.placeholderContent.classList.add('hidden');
        elements.resultContent.innerHTML = '';
        elements.resultContent.classList.add('hidden');
        elements.loadingAnimation.classList.remove('hidden');

        try {
            const data = await fetchFromApi('gemini-proxy', { category: state.currentCategory, title });
            state.currentAnalysisData = data;
            renderResults(data);
            saveToHistory(title, state.currentCategory, data);
            updateImpactStats('analyses');
        } catch (e) {
            renderErrorState(elements.resultContent, `<strong>Request Failed:</strong><br>${e.message}`);
            elements.resultContent.classList.remove('hidden');
        } finally {
            elements.analyzeBtn.disabled = false;
            elements.loadingAnimation.classList.add('hidden');
        }
    };

    const renderResults = (data) => {
        const summaryHtml = data.summary ? marked.parse(data.summary) : '<p>No summary provided.</p>';
        const isFav = isFavorite(data.productName);
        elements.resultContent.innerHTML = `
            <article class="reveal">
                <div class="glass-ui p-6 rounded-2xl relative">
                    <button class="favorite-btn absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition" aria-label="Save to Favorites">
                        <svg class="w-6 h-6 ${isFav ? 'text-yellow-400' : 'text-white/70'}" fill="${isFav ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                    </button>
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="md:w-1/3 flex-shrink-0 reveal reveal-delay-1"><img src="${data.productImage}" alt="${data.productName}" class="w-full rounded-lg shadow-lg" onerror="this.src='https.placehold.co/400x400/1f2937/e5e7eb?text=Image+Not+Found'; this.onerror=null;"></div>
                        <div class="md:w-2/3">
                            <h2 class="text-3xl font-bold text-white reveal reveal-delay-2">${data.productName}</h2>
                            <p class="text-lg font-semibold ${data.isRecommended ? 'text-teal-400' : 'text-red-400'} my-4 reveal reveal-delay-3">${data.verdict}</p>
                            <div class="prose prose-invert max-w-none reveal reveal-delay-4">${summaryHtml}</div>
                        </div>
                    </div>
                </div>
            </article>
            <section class="mt-12">
                <h3 class="text-2xl font-bold text-white mb-6 ml-2 reveal reveal-delay-4">${data.recommendations.title}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${(data.recommendations.items || []).map((item, index) => `
                        <div class="reveal recommendation-card tilt-card glass-ui p-4 rounded-lg flex flex-col" style="transition-delay: ${500 + index * 100}ms;">
                            <img src="${item.image}" alt="${item.name}" class="w-full h-48 rounded-md mb-4 object-cover" onerror="this.src='https.placehold.co/400x400/1f2937/e5e7eb?text=Image'; this.onerror=null;">
                            <h4 class="font-bold text-white flex-grow">${item.name}</h4>
                            <p class="text-sm text-white/60 my-3 flex-grow">${item.description}</p>
                            <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="mt-auto block text-center w-full bg-teal-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-teal-600 transition">View Product</a>
                        </div>
                    `).join('')}
                </div>
            </section>`;
        elements.resultContent.classList.remove('hidden');
        setTimeout(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed')), 10);
    };

    // --- 7. NEW FEATURE: FAVORITES ---
    const isFavorite = (productName) => state.favorites.some(fav => fav.productName === productName);
    const toggleFavorite = () => {
        if (!state.currentAnalysisData) return;
        const productName = state.currentAnalysisData.productName;
        if (isFavorite(productName)) {
            state.favorites = state.favorites.filter(fav => fav.productName !== productName);
            showNotification("Removed from favorites!");
        } else {
            state.favorites.push(state.currentAnalysisData);
            showNotification("Added to favorites!");
        }
        localStorage.setItem('ecoGenieFavorites', JSON.stringify(state.favorites));
        renderResults(state.currentAnalysisData); 
    };

    // --- 8. NEW FEATURE: IMPACT TRACKER ---
    const updateImpactStats = (type) => {
        if (type in state.impactStats) {
            state.impactStats[type]++;
        }
        localStorage.setItem('ecoGenieImpact', JSON.stringify(state.impactStats));
        renderImpactStats();
    };
    const renderImpactStats = () => {
        if (elements.impactTrackerContainer) {
            elements.impactTrackerContainer.innerHTML = `
                <div class="flex gap-4 justify-center">
                    <span><strong>Analyses Run:</strong> ${state.impactStats.analyses}</span>
                    <span><strong>Discoveries Made:</strong> ${state.impactStats.discoveries}</span>
                </div>
            `;
        }
    };

    // --- 9. DISCOVER & LEARN PAGES ---
    const loadDiscoverContent = async () => {
        renderLoadingState(elements.discoverGrid, "Discovering products...");
        try {
            const data = await fetchFromApi('discover-content', {});
            state.discover.products = data.products;
            state.discover.loaded = true;
            renderDiscoverPage();
            updateImpactStats('discoveries');
        } catch (error) {
            renderErrorState(elements.discoverGrid, error.message);
        }
    };
    
    const loadLearnContent = async () => {
        renderLoadingState(elements.articleListContainer, "Generating articles...");
        try {
            const data = await fetchFromApi('learn-content', { action: 'getFullLearnContent' });
            state.learn.articles = data.articles;
            state.learn.loaded = true;
            renderArticleList();
        } catch (error) {
            renderErrorState(elements.articleListContainer, error.message);
        }
    };
    
    const renderDiscoverPage = () => {
        elements.discoverGrid.innerHTML = state.discover.products.map(renderProductCard).join('');
    };
    
    const renderProductCard = (product) => {
        return `
            <a href="${product.link}" target="_blank" rel="noopener noreferrer" class="discover-card tilt-card glass-ui p-4 rounded-lg flex flex-col">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 rounded-md mb-4 object-cover">
                <h4 class="font-bold text-white">${product.name}</h4>
                <p class="text-xs text-white/50 mb-2">by ${product.brand}</p>
                <p class="text-sm text-white/70 my-2 flex-grow">${product.description}</p>
                <div class="flex flex-wrap gap-2 mt-4">
                    ${(product.tags || []).map(tag => `<span class="text-xs bg-teal-500/20 text-teal-300 px-2 py-1 rounded-full">${tag}</span>`).join('')}
                </div>
            </a>
        `;
    };

    const renderArticleList = () => {
        if (state.learn.articles.length === 0) {
            elements.articleListContainer.innerHTML = `<p class="text-white/70 col-span-full text-center">No articles found.</p>`;
            return;
        }
        elements.articleListContainer.innerHTML = state.learn.articles.map(article => `
            <div class="article-card tilt-card glass-ui p-4 rounded-lg flex flex-col cursor-pointer" data-article-id="${article.id}">
                <img src="${article.image}" alt="${article.title}" class="w-full h-40 rounded-md mb-4 object-cover">
                <h4 class="font-bold text-white flex-grow">${article.title}</h4>
                <p class="text-sm text-white/60 my-2">${article.summary}</p>
                <span class="text-xs text-white/50 mt-2">By ${article.author} - ${article.date}</span>
            </div>
        `).join('');
    };

    const handleArticleClick = (e) => {
        const card = e.target.closest('.article-card');
        if (!card) return;
        const articleId = card.dataset.articleId;
        const articleData = state.learn.articles.find(a => a.id === articleId);
        if (articleData) {
            elements.learnListView.classList.add('hidden');
            renderFullArticle(articleData);
            elements.learnArticleView.classList.remove('hidden');
            window.scrollTo(0, 0);
        }
    };
    
    const renderFullArticle = (article) => {
        elements.learnArticleView.innerHTML = `
            <button id="back-to-learn" class="glass-ui px-4 py-2 rounded-full text-sm mb-8 hover:border-teal-400/50">&larr; Back to Articles</button>
            <article class="article-content">
                <h1 class="text-4xl font-bold text-white mb-4">${article.title}</h1>
                <p class="text-white/60 mb-6">By ${article.author} | ${article.date}</p>
                <img src="${article.image}" alt="${article.title}" class="w-full rounded-lg mb-8">
                <div class="glass-ui p-6 rounded-lg mb-8">
                    <h3 class="text-xl font-bold text-teal-400 mb-4">Key Takeaways</h3>
                    <div class="prose prose-invert">${marked.parse(article.takeaways)}</div>
                </div>
                <div class="prose prose-invert">${marked.parse(article.content)}</div>
            </article>
        `;
    };

    // --- 10. HISTORY PANEL ---
    const saveToHistory = (title, category, resultData) => {
        const historyEntry = { id: Date.now(), title, category, resultData };
        state.history.unshift(historyEntry);
        if (state.history.length > 20) state.history.pop();
        localStorage.setItem('ecoGenieHistory', JSON.stringify(state.history));
        renderHistory();
    };

    const renderHistory = () => {
        elements.clearHistoryBtn.disabled = state.history.length === 0;
        if (state.history.length === 0) {
            elements.historyList.innerHTML = `<div class="p-4 text-center text-white/60">No past analyses found.</div>`;
            return;
        }
        elements.historyList.innerHTML = state.history.map(item => `
            <div class="history-item p-4 -mx-4 rounded-lg hover:bg-white/5 transition cursor-pointer" data-history-id="${item.id}">
                <p class="font-bold text-white truncate">${item.title}</p>
                <p class="text-sm text-white/60">Category: ${item.category}</p>
            </div>`).join('');
    };
    
    const handleHistoryClick = (e) => {
        const itemEl = e.target.closest('.history-item');
        if (itemEl) {
            const id = Number(itemEl.dataset.historyId);
            const historyItem = state.history.find(item => item.id === id);
            if (historyItem) {
                showPage('home');
                state.currentAnalysisData = historyItem.resultData;
                elements.placeholderContent.classList.add('hidden');
                elements.loadingAnimation.classList.add('hidden');
                renderResults(historyItem.resultData);
                togglePanel(elements.historyPanel, false);
            }
        }
    };
    
    const clearHistory = () => {
        const onConfirm = () => {
            state.history = [];
            localStorage.removeItem('ecoGenieHistory');
            renderHistory();
            showNotification("History cleared successfully.");
            toggleModal(elements.confirmModal, false);
        };
        const onCancel = () => toggleModal(elements.confirmModal, false);
        toggleModal(elements.confirmModal, true);
        elements.confirmModalConfirm.onclick = onConfirm;
        elements.confirmModalCancel.onclick = onCancel;
        elements.confirmModalOverlay.onclick = onCancel;
    };

    // --- 11. EVENT LISTENERS ---
    
    const setupEventListeners = () => {
        document.body.addEventListener('click', (e) => {
            const target = e.target.closest('button, a, .history-item, .article-card');
            if (!target) return;

            const id = target.id;
            const classList = target.classList;

            if (id === 'analyze-btn') handleAnalysis();
            else if (classList.contains('category-btn')) updateCategory(target.dataset.category, target);
            else if (classList.contains('nav-link') || classList.contains('mobile-nav-link')) {
                e.preventDefault();
                showPage(target.getAttribute('href').substring(1));
            }
            else if (id === 'history-btn') togglePanel(elements.historyPanel, true);
            else if (id === 'close-history-btn') togglePanel(elements.historyPanel, false);
            else if (id === 'clear-history-btn') clearHistory();
            else if (classList.contains('history-item')) handleHistoryClick(e);
            else if (id === 'mobile-menu-btn') togglePanel(elements.mobileMenu, true);
            else if (id === 'close-mobile-menu-btn') togglePanel(elements.mobileMenu, false);
            else if (classList.contains('article-card')) handleArticleClick(e);
            else if (id === 'back-to-learn') {
                elements.learnArticleView.classList.add('hidden');
                elements.learnListView.classList.remove('hidden');
            }
            else if (classList.contains('favorite-btn')) toggleFavorite();
        });

        document.body.addEventListener('keydown', e => {
            if (e.target.id === 'prod-title' && e.key === 'Enter') handleAnalysis();
        });
    };

    // --- 12. APP INITIALIZATION ---

    const initializeApp = () => {
        init3DBackground();
        setupEventListeners();
        renderImpactStats();
        updateCategory('eco', document.querySelector('.category-btn[data-category="eco"]'));
        renderHistory();
        showPage('home');
    };

    initializeApp();
});
