// content.js - Content script for product scanning
// This script runs on e-commerce pages to scan for products and eco-friendly alternatives

// Initialize the content script
console.log('Eco Shopping Assistant - Content Script Loaded');

// Function to scan products on the current page
function scanProducts() {
  console.log('Scanning for products on the page...');
  
  // Placeholder: Extract product information from the page
  const products = [];
  
  // Look for common product selectors (placeholder implementation)
  const productElements = document.querySelectorAll('.product, .item, [data-product]');
  
  productElements.forEach(element => {
    const product = {
      name: element.querySelector('.product-name, .title, h1, h2')?.textContent?.trim(),
      price: element.querySelector('.price, .cost, .amount')?.textContent?.trim(),
      image: element.querySelector('img')?.src,
      url: window.location.href
    };
    
    if (product.name) {
      products.push(product);
    }
  });
  
  console.log('Found products:', products);
  return products;
}

// Function to find eco-friendly alternatives
function findEcoAlternatives(productName) {
  console.log('Searching for eco-friendly alternatives for:', productName);
  
  // Placeholder: This would integrate with the eco brands database
  // For now, return mock data
  return [
    {
      name: `Eco-friendly alternative to ${productName}`,
      brand: 'EcoBrand',
      rating: 4.5,
      url: '#'
    }
  ];
}

// Function to display eco-friendly suggestions
function displayEcoSuggestions(alternatives) {
  // Placeholder: Create and show suggestion popup
  console.log('Displaying eco-friendly suggestions:', alternatives);
  
  // This would integrate with popup.js to show suggestions
  chrome.runtime.sendMessage({
    action: 'showAlternatives',
    data: alternatives
  });
}

// Main execution
function init() {
  // Wait for page to load completely
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanProducts);
  } else {
    scanProducts();
  }
  
  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scanPage') {
      const products = scanProducts();
      sendResponse(products);
    }
  });
}

// Initialize the content script
init();
