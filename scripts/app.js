import { startCamera, stopCamera, captureFrame } from './camera.js';
import { getProductInfo, getFavorites, getImpactData, getLearningTips } from './ai.js';
import { renderResults, renderFavorites, renderImpact, renderLearningHub } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const pages = {
        home: document.getElementById('page-home'),
        results: document.getElementById('page-results'),
        favorites: document.getElementById('page-favorites'),
        impact: document.getElementById('page-impact'),
        learn: document.getElementById('page-learn'),
    };
    const navButtons = document.querySelectorAll('.nav-button');
    const scannerContainer = document.getElementById('scanner-container');
    const cameraFeedEl = document.getElementById('camera-feed');
    const scannerStatusEl = document.getElementById('scanner-status');
    const uploadBtn = document.getElementById('upload-btn');
    const imageUploadInput = document.getElementById('image-upload-input');
    let impactChartInstance;

    // --- Navigation ---
    function showPage(pageId) {
        // Stop the camera if navigating away from the home page
        if (pageId !== 'home') {
            stopCamera();
        }

        // Hide all pages and update navigation button states
        Object.values(pages).forEach(page => page.classList.remove('active'));
        pages[pageId]?.classList.add('active');
        navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.page === pageId));

        // Perform actions specific to the new page
        if (pageId === 'home') {
            setTimeout(() => startCamera(cameraFeedEl, scannerStatusEl), 100);
        } else if (pageId === 'favorites') {
            renderFavorites(pages.favorites, getFavorites());
        } else if (pageId === 'impact') {
            const chartId = renderImpact(pages.impact, getImpactData());
            const data = getImpactData();
            const ctx = document.getElementById(chartId).getContext('2d');
            if (impactChartInstance) impactChartInstance.destroy();
            Chart.defaults.color = '#9ca3af';
            impactChartInstance = new Chart(ctx, { type: 'doughnut', data: { labels: ['Excellent', 'Good', 'Poor'], datasets: [{ data: [data.choices.excellent, data.choices.good, data.choices.poor], backgroundColor: ['#22c55e', '#84cc16', '#ef4444'], borderColor: '#1f2937', borderWidth: 4 }] }, options: { responsive: true, cutout: '70%', plugins: { legend: { position: 'bottom', labels: { color: '#9ca3af' } } } } });
        } else if (pageId === 'learn') {
            renderLearningHub(pages.learn, getLearningTips());
        }
    }

    navButtons.forEach(button => {
        button.addEventListener('click', () => showPage(button.dataset.page));
    });

    // --- Core App Logic ---
    async function analyzeImage(imageData) {
        if (!imageData) {
            scannerStatusEl.textContent = "Failed to capture image.";
            return;
        }
        scannerStatusEl.textContent = `Analyzing...`;
        stopCamera();
        
        // Get analysis from the AI module
        const productInfo = await getProductInfo(imageData);
        
        // Render the results on the results page
        renderResults(pages.results, productInfo);
        showPage('results');
    }
    
    // Handle tap on the AI Vision scanner
    scannerContainer.addEventListener('click', () => {
        const imageData = captureFrame(cameraFeedEl);
        analyzeImage(imageData);
    });

    // Handle file upload
    uploadBtn.addEventListener('click', () => imageUploadInput.click());
    imageUploadInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                // Get the base64 string, removing the data URI prefix
                const imageData = e.target.result.split(',')[1];
                analyzeImage(imageData);
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Initialization ---
    function init() {
        console.log("EcoSnap App Initialized (v1.5)");
        showPage('home');
    }

    init();
});
