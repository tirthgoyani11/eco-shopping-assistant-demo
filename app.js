/**
 * =================================================================
 * Eco Jinner - Definitive Application Logic (v12 - AI Learn Page)
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
        
        // Always show the article list view when navigating to the learn page
        if (pageId === 'learn') {
            elements.learnListView.classList.remove('hidden');
            elements.learnArticleView.classList.add('hidden');
        }

        togglePanel(elements.mobileMenu, false);
    };

    // --- 5. Core & UI Functions ---
    const updateCategory = (category, buttonEl) => { /* ... */ };
    const togglePanel = (panel, show) => { /* ... */ };
    const showNotification = (message, type = 'success') => { /* ... */ };
    const toggleModal = (modal, show) => { /* ... */ };

    // --- 6. Main Analysis Logic ---
    const handleAnalysis = async () => { /* ... */ };
    const renderResults = (data) => { /* ... */ };

    // --- 7. History Panel Logic ---
    const saveToHistory = (title, category, resultData) => { /* ... */ };
    const renderHistory = () => { /* ... */ };
    const handleHistoryClick = (e) => { /* ... */ };
    const clearHistory = () => { /* ... */ };

    // --- 8. Discover Page Logic ---
    const loadDiscoverContent = async () => { /* ... */ };
    const loadProductSpotlight = async () => { /* ... */ };
    const renderDiscoverFilters = () => { /* ... */ };
    const renderEditorsPicks = () => { /* ... */ };
    const renderDiscoverGrid = () => { /* ... */ };
    const renderProductCard = (product) => { /* ... */ };

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
            
            renderFullArticle(articleData, data.content, data.takeaways);
        } catch (error) {
            elements.learnArticleView.innerHTML = `<p class="text-red-400 text-center">${error.message}</p>`;
        }
    };

    const renderFullArticle = (article, content, takeaways) => {
        elements.learnArticleView.innerHTML = `
            <button id="back-to-learn" class="glass-ui px-4 py-2 rounded-full text-sm mb-8 hover:border-emerald-400/50">&larr; Back to Articles</button>
            <article class="article-content">
                <h1 class="text-4xl font-bold text-white mb-4">${article.title}</h1>
                <p class="text-white/60 mb-6">By ${article.author} | ${article.date}</p>
                <img src="${article.image}" alt="${article.title}" class="w-full rounded-lg mb-8">
                
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
    elements.navLinks.forEach(link => { /* ... */ });
    elements.analyzeBtn.addEventListener('click', handleAnalysis);
    elements.prodTitleInput.addEventListener('keydown', e => { if (e.key === 'Enter') handleAnalysis(); });
    elements.categorySelector.addEventListener('click', e => { /* ... */ });
    elements.historyBtn.addEventListener('click', () => togglePanel(elements.historyPanel, true));
    elements.closeHistoryBtn.addEventListener('click', () => togglePanel(elements.historyPanel, false));
    elements.historyList.addEventListener('click', handleHistoryClick);
    elements.clearHistoryBtn.addEventListener('click', clearHistory);
    elements.mobileMenuBtn.addEventListener('click', () => togglePanel(elements.mobileMenu, true));
    elements.closeMobileMenuBtn.addEventListener('click', () => togglePanel(elements.mobileMenu, false));
    elements.discoverFilters.addEventListener('click', (e) => { /* ... */ });

    // Learn Page Listeners
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
