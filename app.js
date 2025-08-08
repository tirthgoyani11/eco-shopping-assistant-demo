/**
 * =================================================================
 * Eco Jinner - Definitive Application Logic (v9 - Complete)
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
    };

    // --- 3. State Management ---
    let selectedCategory = 'eco';
    const state = {
        history: JSON.parse(localStorage.getItem('ecoJinnerHistory')) || [],
    };

    // --- 4. Navigation Logic ---
    const showPage = (pageId) => {
        elements.pageContents.forEach(page => page.classList.add('hidden'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.remove('hidden');

        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active-link', link.getAttribute('href') === `#${pageId}`);
        });
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

    // --- 6. Main Analysis Logic ---
    const handleAnalysis = async () => {
        const title = elements.prodTitleInput.value.trim();
        if (!title) {
            showNotification("Please enter a product name.", 'error');
            return;
        }
        elements.analyzeBtn.disabled = true;
        elements.placeholderContent.classList.add('hidden');
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

    // --- 8. Event Listeners ---
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

    // --- 9. Initial Application Setup ---
    const initializeApp = () => {
        updateCategory('eco', document.querySelector('.category-btn[data-category="eco"]'));
        renderHistory();
        showPage('home');
    };

    initializeApp();
});
