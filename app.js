/**
 * =================================================================
 * Eco Jinner - Definitive Application Logic (v13 - AI Images)
 * =================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. 3D Background Setup ---
    if (typeof THREE !== 'undefined') {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('bg-canvas'), alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        const geometry = new THREE.IcosahedronGeometry(1.5, 0);
        const material = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true });
        const shape = new THREE.Mesh(geometry, material);
        scene.add(shape);
        camera.position.z = 5;
        const animate3D = () => {
            requestAnimationFrame(animate3D);
            shape.rotation.x += 0.001;
            shape.rotation.y += 0.001;
            renderer.render(scene, camera);
        };
        animate3D();
        window.addEventListener('resize', () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
        });
    }

    // --- 2. DOM Element References ---
    const elements = {
        navLinks: document.querySelectorAll('.nav-link, .mobile-nav-link'),
        pageContents: document.querySelectorAll('.page-content'),
        analyzeBtn: document.getElementById('analyze-btn'),
        prodTitleInput: document.getElementById('prod-title'),
        categorySelector: document.getElementById('category-selector'),
        categoryDisplay: document.getElementById('category-display'),
        placeholderContent: document.getElementById('placeholder-content'),
        loadingAnimation: document.getElementById('loading-animation'),
        resultContent: document.getElementById('result-content'),
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
        productSpotlight: document.getElementById('product-spotlight'),
        discoverFilters: document.getElementById('discover-filters'),
        editorsPicksSection: document.getElementById('editors-picks-section'),
        editorsPicksGrid: document.getElementById('editors-picks-grid'),
        discoverGrid: document.getElementById('discover-grid'),
        learnListView: document.getElementById('learn-list-view'),
        learnArticleView: document.getElementById('learn-article-view'),
        articleListContainer: document.getElementById('article-list-container'),
        aiQuestionInput: document.getElementById('ai-question-input'),
        aiQuestionBtn: document.getElementById('ai-question-btn'),
        aiAnswerContainer: document.getElementById('ai-answer-container'),
    };

    // --- 3. State Management ---
    let selectedCategory = 'eco';
    const state = {
        history: JSON.parse(localStorage.getItem('ecoJinnerHistory')) || [],
        discover: { products: [], editorsPicks: [], activeFilter: 'All' },
        learn: { articles: [] },
    };

    // --- 4. Navigation Logic ---
    const showPage = (pageId) => {
        elements.pageContents.forEach(page => page.classList.add('hidden'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.remove('hidden');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active-link', link.getAttribute('href') === `#${pageId}`);
        });
        
        if (pageId === 'discover' && state.discover.products.length === 0) loadDiscoverContent();
        if (pageId === 'learn' && state.learn.articles.length === 0) loadLearnContent();
        
        if (pageId === 'learn') {
            elements.learnListView.classList.remove('hidden');
            elements.learnArticleView.classList.add('hidden');
        }

        togglePanel(elements.mobileMenu, false);
    };

    // --- 5. Core & UI Functions ---
    const updateCategory = (category, buttonEl) => {
        selectedCategory = category;
        const icon = buttonEl.textContent.split(' ')[0];
        const text = buttonEl.textContent.split(' ').slice(1).join(' ');
        elements.categoryDisplay.innerHTML = `<span class="text-xl">${icon}</span> <span class="hidden md:inline">${text}</span>`;
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active', 'border-emerald-400');
            btn.setAttribute('aria-checked', 'false');
        });
        buttonEl.classList.add('active', 'border-emerald-400');
        buttonEl.setAttribute('aria-checked', 'true');
        elements.prodTitleInput.focus();
    };
    
    const togglePanel = (panel, show) => {
        if (show) panel.classList.remove('translate-x-full');
        else panel.classList.add('translate-x-full');
    };

    const showNotification = (message, type = 'success') => {
        elements.notificationMessage.textContent = message;
        elements.notificationModal.className = `fixed bottom-5 left-1/2 -translate-x-1/2 text-white px-6 py-3 rounded-full shadow-lg opacity-0 transform translate-y-10 pointer-events-none ${type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`;
        requestAnimationFrame(() => elements.notificationModal.classList.remove('opacity-0', 'translate-y-10'));
        setTimeout(() => elements.notificationModal.classList.add('opacity-0', 'translate-y-10'), 3000);
    };
    
    const toggleModal = (modal, show) => {
        const overlay = document.getElementById(modal.id + '-overlay');
        if (show) {
            modal.classList.remove('hidden');
            if (overlay) overlay.classList.remove('hidden');
        } else {
            modal.classList.add('hidden');
            if (overlay) overlay.classList.add('hidden');
        }
    };

    // --- 6. Main Analysis Logic ---
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
            await new Promise(resolve => setTimeout(resolve, 2500));
            const response = await fetch('/.netlify/functions/gemini-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: selectedCategory, title }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({ error: `Server error: ${response.status}` }));
                throw new Error(err.error || `An unknown server error occurred.`);
            }
            const data = await response.json();
            renderResults(data);
            saveToHistory(title, selectedCategory, data);
        } catch (e) {
            elements.resultContent.innerHTML = `<div class="glass-ui p-6 rounded-2xl text-center"><p class="text-red-400"><strong>Request Failed:</strong><br>${e.message}</p></div>`;
            elements.resultContent.classList.remove('hidden');
        } finally {
            elements.analyzeBtn.disabled = false;
            elements.loadingAnimation.classList.add('hidden');
        }
    };

    const renderResults = (data) => {
        const summaryHtml = data.summary ? marked.parse(data.summary) : '<p>No summary provided.</p>';
        elements.resultContent.innerHTML = `
            <article class="reveal">
                <div class="glass-ui p-6 rounded-2xl">
                    <div class="flex flex-col md:flex-row gap-8">
                        <div class="md:w-1/3 flex-shrink-0 reveal reveal-delay-1"><img src="${data.productImage}" alt="${data.productName}" class="w-full rounded-lg shadow-lg" onerror="this.src='https://placehold.co/400x400/1f2937/e5e7eb?text=Image+Not+Found'; this.onerror=null;"></div>
                        <div class="md:w-2/3">
                            <h2 class="text-3xl font-bold text-white reveal reveal-delay-2">${data.productName}</h2>
                            <p class="text-lg font-semibold ${data.isRecommended ? 'text-emerald-400' : 'text-red-400'} my-4 reveal reveal-delay-3">${data.verdict}</p>
                            <div class="prose prose-invert max-w-none reveal reveal-delay-4">${summaryHtml}</div>
                        </div>
                    </div>
                </div>
            </article>
            <section class="mt-12">
                <h3 class="text-2xl font-bold text-white mb-6 ml-2 reveal reveal-delay-4">${data.recommendations.title}</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${(data.recommendations.items || []).map((item, index) => `
                        <div class="reveal recommendation-card glass-ui p-4 rounded-lg flex flex-col" style="transition-delay: ${500 + index * 100}ms;">
                            <img src="${item.image}" alt="${item.name}" class="w-full h-48 rounded-md mb-4 object-cover" onerror="this.src='https://placehold.co/400x400/1f2937/e5e7eb?text=Image'; this.onerror=null;">
                            <h4 class="font-bold text-white flex-grow">${item.name}</h4>
                            <p class="text-sm text-white/60 my-3 flex-grow">${item.description}</p>
                            <a href="${item.link}" target="_blank" rel="noopener noreferrer" class="mt-auto block text-center w-full bg-emerald-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-emerald-600 transition">View Product</a>
                        </div>
                    `).join('')}
                </div>
            </section>`;
        elements.resultContent.classList.remove('hidden');
        setTimeout(() => document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed')), 10);
    };

    // --- 7. History Panel Logic ---
    const saveToHistory = (title, category, resultData) => {
        const historyEntry = { id: Date.now(), title, category, resultData };
        state.history.unshift(historyEntry);
        if (state.history.length > 20) state.history.pop();
        localStorage.setItem('ecoJinnerHistory', JSON.stringify(state.history));
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
            localStorage.removeItem('ecoJinnerHistory');
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

    // --- 8. Discover Page Logic ---
    const loadDiscoverContent = async () => {
        try {
            const response = await fetch('/.netlify/functions/discover-content');
            if (!response.ok) throw new Error('Failed to fetch content.');
            const data = await response.json();
            
            state.discover.products = data.products;
            state.discover.editorsPicks = data.editorsPicks;

            renderDiscoverFilters();
            renderEditorsPicks();
            renderDiscoverGrid();
            loadProductSpotlight();

        } catch (error) {
            elements.discoverGrid.innerHTML = `<p class="text-red-400 text-center col-span-full">${error.message}</p>`;
        }
    };

    const loadProductSpotlight = async () => {
        elements.productSpotlight.innerHTML = `<p class="text-white/70">✨ Generating product spotlight with AI...</p>`;
        elements.productSpotlight.classList.remove('hidden');
        try {
            const randomProduct = state.discover.products[Math.floor(Math.random() * state.discover.products.length)];
            const prompt = `Write a short, exciting spotlight for: ${randomProduct.name}.`;
            const response = await fetch('/.netlify/functions/gemini-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ category: 'eco', title: prompt }),
            });
            if (!response.ok) throw new Error('AI spotlight failed.');
            const data = await response.json();
            const aiText = data.summary ? marked.parse(data.summary) : "Could not generate AI spotlight.";
            elements.productSpotlight.innerHTML = `<h3 class="text-2xl font-bold text-emerald-400 mb-4">Product Spotlight</h3><div class="prose prose-invert max-w-none">${aiText}</div>`;
        } catch (error) {
            elements.productSpotlight.innerHTML = `<p class="text-red-400">Could not load AI spotlight.</p>`;
        }
    };

    const renderDiscoverFilters = () => {
        const allTags = new Set(['All', ...state.discover.products.flatMap(p => p.tags)]);
        elements.discoverFilters.innerHTML = [...allTags].map(tag => `<button class="filter-btn px-4 py-2 rounded-full text-sm ${tag === 'All' ? 'active-filter' : ''}" data-filter="${tag}">${tag}</button>`).join('');
    };

    const renderEditorsPicks = () => {
        if(state.discover.editorsPicks.length > 0) {
            elements.editorsPicksGrid.innerHTML = state.discover.editorsPicks.map(renderProductCard).join('');
            elements.editorsPicksSection.classList.remove('hidden');
        }
    };

    const renderDiscoverGrid = () => {
        const filtered = state.discover.activeFilter === 'All' ? state.discover.products : state.discover.products.filter(p => p.tags.includes(state.discover.activeFilter));
        if (filtered.length === 0) {
            elements.discoverGrid.innerHTML = `<p class="text-white/70 col-span-full text-center">No products found.</p>`;
            return;
        }
        elements.discoverGrid.innerHTML = filtered.map(renderProductCard).join('');
    };

    const renderProductCard = (product) => {
        return `
            <a href="${product.link}" target="_blank" rel="noopener noreferrer" class="discover-card glass-ui p-4 rounded-lg flex flex-col">
                <img src="${product.image}" alt="${product.name}" class="w-full h-48 rounded-md mb-4 object-cover">
                <h4 class="font-bold text-white">${product.name}</h4>
                <p class="text-xs text-white/50 mb-2">by ${product.brand}</p>
                <p class="text-sm text-white/70 my-2 flex-grow">${product.description}</p>
                <div class="flex flex-wrap gap-2 mt-4">
                    ${product.tags.map(tag => `<span class="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">${tag}</span>`).join('')}
                </div>
            </a>
        `;
    };

    // --- 9. AI Learn Hub Logic ---
    const loadLearnContent = async () => {
        try {
            const response = await fetch('/.netlify/functions/learn-content', {
                method: 'POST',
                body: JSON.stringify({ action: 'getArticleList' })
            });
            if (!response.ok) throw new Error('Failed to fetch articles.');
            const data = await response.json();
            state.learn.articles = data.articles;
            renderArticleList();
        } catch (error) {
            elements.articleListContainer.innerHTML = `<p class="text-red-400 text-center col-span-full">${error.message}</p>`;
        }
    };

    const renderArticleList = () => {
        if (state.learn.articles.length === 0) {
            elements.articleListContainer.innerHTML = `<p class="text-white/70 col-span-full text-center">No articles found.</p>`;
            return;
        }
        elements.articleListContainer.innerHTML = state.learn.articles.map(article => `
            <div class="article-card glass-ui p-4 rounded-lg flex flex-col cursor-pointer" data-article-id="${article.id}">
                <img src="${article.image}" alt="${article.title}" class="w-full h-40 rounded-md mb-4 object-cover">
                <h4 class="font-bold text-white flex-grow">${article.title}</h4>
                <p class="text-sm text-white/60 my-2">${article.summary}</p>
                <span class="text-xs text-white/50 mt-2">By ${article.author} - ${article.date}</span>
            </div>
        `).join('');
    };

    const handleArticleClick = async (e) => {
        const card = e.target.closest('.article-card');
        if (!card) return;

        const articleId = card.dataset.articleId;
        const articleData = state.learn.articles.find(a => a.id === articleId);
        
        elements.learnListView.classList.add('hidden');
        elements.learnArticleView.innerHTML = `<div class="loader-container py-20"><div class="glitch-text" data-text="Generating article..."></div></div>`;
        elements.learnArticleView.classList.remove('hidden');
        window.scrollTo(0, 0);

        try {
            const response = await fetch('/.netlify/functions/learn-content', {
                method: 'POST',
                body: JSON.stringify({ action: 'getArticleContent', payload: articleId })
            });
            if (!response.ok) throw new Error('Failed to generate article content.');
            const data = await response.json();
            
            // **FIX IS HERE**: Pass the new AI-generated image (data.image) to the render function
            renderFullArticle(articleData, data.content, data.takeaways, data.image);
        } catch (error) {
            elements.learnArticleView.innerHTML = `<p class="text-red-400 text-center">${error.message}</p>`;
        }
    };

    // **FIX IS HERE**: Accept the new `imageUrl` parameter
    const renderFullArticle = (article, content, takeaways, imageUrl) => {
        elements.learnArticleView.innerHTML = `
            <button id="back-to-learn" class="glass-ui px-4 py-2 rounded-full text-sm mb-8 hover:border-emerald-400/50">&larr; Back to Articles</button>
            <article class="article-content">
                <h1 class="text-4xl font-bold text-white mb-4">${article.title}</h1>
                <p class="text-white/60 mb-6">By ${article.author} | ${article.date}</p>
                <!-- Use the new imageUrl here -->
                <img src="${imageUrl}" alt="${article.title}" class="w-full rounded-lg mb-8">
                
                <div class="glass-ui p-6 rounded-lg mb-8">
                    <h3 class="text-xl font-bold text-emerald-400 mb-4">Key Takeaways</h3>
                    <div class="prose prose-invert">${marked.parse(takeaways)}</div>
                </div>

                <div class="prose prose-invert">${marked.parse(content)}</div>
            </article>
        `;
    };

    const handleAskAiExpert = async () => {
        const question = elements.aiQuestionInput.value.trim();
        if (!question) {
            showNotification("Please enter a question.", "error");
            return;
        }
        elements.aiQuestionBtn.disabled = true;
        elements.aiAnswerContainer.innerHTML = `<div class="loader-container py-4"><p class="text-white/70">AI is thinking...</p></div>`;

        try {
            const response = await fetch('/.netlify/functions/learn-content', {
                method: 'POST',
                body: JSON.stringify({ action: 'askQuestion', payload: question })
            });
             if (!response.ok) throw new Error('Failed to get an answer from the AI.');
            const data = await response.json();
            
            elements.aiAnswerContainer.innerHTML = `
                <div class="glass-ui p-4 rounded-lg">
                    <p class="text-white/90">${data.answer}</p>
                    <h4 class="font-bold text-emerald-400 mt-4 mb-2">Related Questions:</h4>
                    <div class="flex flex-col items-start gap-2">
                        ${data.relatedQuestions.map(q => `<button class="related-question-btn text-left text-sm text-white/70 hover:text-white transition">${q}</button>`).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            elements.aiAnswerContainer.innerHTML = `<p class="text-red-400">${error.message}</p>`;
        } finally {
            elements.aiQuestionBtn.disabled = false;
        }
    };

    // --- 10. Event Listeners ---
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(link.getAttribute('href').substring(1));
        });
    });
    
    elements.analyzeBtn.addEventListener('click', handleAnalysis);
    elements.prodTitleInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAnalysis(); });
    elements.categorySelector.addEventListener('click', e => {
        const btn = e.target.closest('.category-btn');
        if (btn) updateCategory(btn.dataset.category, btn);
    });
    
    elements.historyBtn.addEventListener('click', () => togglePanel(elements.historyPanel, true));
    elements.closeHistoryBtn.addEventListener('click', () => togglePanel(elements.historyPanel, false));
    elements.historyList.addEventListener('click', handleHistoryClick);
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
    
    elements.mobileMenuBtn.addEventListener('click', () => togglePanel(elements.mobileMenu, true));
    elements.closeMobileMenuBtn.addEventListener('click', () => togglePanel(elements.mobileMenu, false));

    elements.discoverFilters.addEventListener('click', (e) => {
        const target = e.target.closest('.filter-btn');
        if (target) {
            state.discover.activeFilter = target.dataset.filter;
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active-filter'));
            target.classList.add('active-filter');
            renderDiscoverGrid();
        }
    });

    elements.articleListContainer.addEventListener('click', handleArticleClick);
    elements.learnArticleView.addEventListener('click', (e) => {
        if (e.target.id === 'back-to-learn') {
            elements.learnArticleView.classList.add('hidden');
            elements.learnListView.classList.remove('hidden');
        }
    });
    elements.aiQuestionBtn.addEventListener('click', handleAskAiExpert);
    elements.aiQuestionInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAskAiExpert(); });
    elements.aiAnswerContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('related-question-btn')) {
            elements.aiQuestionInput.value = e.target.textContent;
            handleAskAiExpert();
        }
    });

    // --- 11. Initial Application Setup ---
    const initializeApp = () => {
        updateCategory('eco', document.querySelector('.category-btn[data-category="eco"]'));
        renderHistory();
        showPage('home');
    };

    initializeApp();
});
