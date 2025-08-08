// popup.js - Browser extension popup interface
// This script handles the popup UI for the eco-shopping assistant extension

// Initialize popup when DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('Eco Shopping Assistant - Popup Loaded');
  initializePopup();
});

// Initialize the popup interface
function initializePopup() {
  setupEventListeners();
  loadCurrentPageData();
  displayWelcomeMessage();
}

// Setup event listeners for popup elements
function setupEventListeners() {
  // Scan current page button
  const scanButton = document.getElementById('scan-button');
  if (scanButton) {
    scanButton.addEventListener('click', scanCurrentPage);
  }
  
  // Settings button
  const settingsButton = document.getElementById('settings-button');
  if (settingsButton) {
    settingsButton.addEventListener('click', openSettings);
  }
  
  // Alternative suggestions container
  const suggestionsContainer = document.getElementById('suggestions-container');
  if (suggestionsContainer) {
    suggestionsContainer.addEventListener('click', handleSuggestionClick);
  }
}

// Function to scan the current page for products
function scanCurrentPage() {
  console.log('Scanning current page for eco-friendly alternatives...');
  
  // Show loading state
  showLoadingState();
  
  // Send message to content script to scan the page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'scanPage'}, function(response) {
      if (response && response.length > 0) {
        displayProducts(response);
        searchForAlternatives(response);
      } else {
        displayNoProductsMessage();
      }
      hideLoadingState();
    });
  });
}

// Function to search for eco-friendly alternatives
function searchForAlternatives(products) {
  console.log('Searching for eco-friendly alternatives...');
  
  const alternatives = [];
  
  products.forEach(product => {
    // Placeholder: This would integrate with the eco brands database
    // For now, generate mock alternatives
    const mockAlternatives = generateMockAlternatives(product);
    alternatives.push(...mockAlternatives);
  });
  
  displayAlternatives(alternatives);
}

// Generate mock eco-friendly alternatives (placeholder)
function generateMockAlternatives(product) {
  return [
    {
      name: `Eco-friendly ${product.name}`,
      brand: 'GreenChoice',
      rating: 4.7,
      price: '$25.99',
      sustainability: 'Organic, Fair Trade',
      url: '#'
    },
    {
      name: `Sustainable ${product.name}`,
      brand: 'EarthFriendly',
      rating: 4.5,
      price: '$28.50',
      sustainability: 'Recycled Materials',
      url: '#'
    }
  ];
}

// Display found products in the popup
function displayProducts(products) {
  const productsContainer = document.getElementById('products-container');
  if (!productsContainer) return;
  
  productsContainer.innerHTML = '<h3>Products Found:</h3>';
  
  products.forEach(product => {
    const productElement = createProductElement(product);
    productsContainer.appendChild(productElement);
  });
}

// Display eco-friendly alternatives
function displayAlternatives(alternatives) {
  const suggestionsContainer = document.getElementById('suggestions-container');
  if (!suggestionsContainer) return;
  
  suggestionsContainer.innerHTML = '<h3>Eco-Friendly Alternatives:</h3>';
  
  alternatives.forEach(alternative => {
    const alternativeElement = createAlternativeElement(alternative);
    suggestionsContainer.appendChild(alternativeElement);
  });
}

// Create HTML element for a product
function createProductElement(product) {
  const element = document.createElement('div');
  element.className = 'product-item';
  element.innerHTML = `
    <div class="product-name">${product.name || 'Unknown Product'}</div>
    <div class="product-price">${product.price || 'Price not available'}</div>
  `;
  return element;
}

// Create HTML element for an alternative product
function createAlternativeElement(alternative) {
  const element = document.createElement('div');
  element.className = 'alternative-item';
  element.innerHTML = `
    <div class="alternative-header">
      <div class="alternative-name">${alternative.name}</div>
      <div class="alternative-rating">★ ${alternative.rating}</div>
    </div>
    <div class="alternative-details">
      <div class="alternative-brand">by ${alternative.brand}</div>
      <div class="alternative-price">${alternative.price}</div>
      <div class="alternative-sustainability">${alternative.sustainability}</div>
    </div>
    <button class="view-alternative" data-url="${alternative.url}">View Product</button>
  `;
  return element;
}

// Handle clicks on suggestion items
function handleSuggestionClick(event) {
  if (event.target.classList.contains('view-alternative')) {
    const url = event.target.getAttribute('data-url');
    if (url && url !== '#') {
      chrome.tabs.create({url: url});
    }
  }
}

// Show loading state in popup
function showLoadingState() {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'block';
  }
}

// Hide loading state
function hideLoadingState() {
  const loadingElement = document.getElementById('loading');
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
}

// Display welcome message
function displayWelcomeMessage() {
  const messageContainer = document.getElementById('message-container');
  if (messageContainer) {
    messageContainer.innerHTML = `
      <h2>Eco Shopping Assistant</h2>
      <p>Find sustainable alternatives to products on this page.</p>
      <button id="scan-button" class="scan-btn">Scan for Eco-Alternatives</button>
    `;
    
    // Re-attach event listener to the new button
    const newScanButton = document.getElementById('scan-button');
    if (newScanButton) {
      newScanButton.addEventListener('click', scanCurrentPage);
    }
  }
}

// Display message when no products are found
function displayNoProductsMessage() {
  const messageContainer = document.getElementById('message-container');
  if (messageContainer) {
    messageContainer.innerHTML = `
      <p>No products detected on this page.</p>
      <p>Try visiting an e-commerce website and scan again.</p>
    `;
  }
}

// Load data for the current page
function loadCurrentPageData() {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentTab = tabs[0];
    console.log('Current page:', currentTab.url);
    
    // Check if we're on a supported e-commerce site
    const supportedSites = ['amazon', 'ebay', 'walmart', 'target', 'shop'];
    const isEcommerceSite = supportedSites.some(site => 
      currentTab.url.toLowerCase().includes(site)
    );
    
    if (!isEcommerceSite) {
      displayUnsupportedSiteMessage();
    }
  });
}

// Display message for unsupported sites
function displayUnsupportedSiteMessage() {
  const messageContainer = document.getElementById('message-container');
  if (messageContainer) {
    const existingContent = messageContainer.innerHTML;
    messageContainer.innerHTML = existingContent + `
      <div class="info-message">
        <p><small>💡 This extension works best on e-commerce websites like Amazon, eBay, Walmart, etc.</small></p>
      </div>
    `;
  }
}

// Open settings/options page
function openSettings() {
  console.log('Opening settings...');
  // Placeholder: This would open the extension's options page
  chrome.runtime.openOptionsPage();
}

// Listen for messages from content script or background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'showAlternatives') {
    displayAlternatives(request.data);
  }
  
  if (request.action === 'updatePopup') {
    loadCurrentPageData();
  }
});
