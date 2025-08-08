// Sample eco-friendly products
const products = [
  {
    name: "EcoBrush Bamboo Toothbrush",
    eco_fact: "100% biodegradable bamboo handle.",
    certification: "FSC Certified"
  },
  {
    name: "GreenLiving Cotton Bag",
    eco_fact: "Reusable, organic cotton.",
    certification: "GOTS Certified"
  },
  {
    name: "RePaper Recycled Notebook",
    eco_fact: "Made from 100% post-consumer recycled paper.",
    certification: "Blue Angel"
  },
  {
    name: "PureSip Glass Water Bottle",
    eco_fact: "Reusable, BPA-free, and fully recyclable.",
    certification: "USDA Biobased"
  }
];

window.onload = () => {
  const list = document.getElementById('product-list');
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img alt="eco badge" class="badge" title="Eco Friendly!"/>
      ${product.name}
      <button onclick="showPopup('${product.name.replace(/'/g, "\\'")}')">Why Eco?</button>
    `;
    list.appendChild(card);
  });
};

function showPopup(name) {
  const product = products.find(p => p.name === name);
  if (!product) return;
  
  const fact = product.eco_fact;
  const cert = product.certification;
  const suggestion = "Switch to eco-friendly options!";
  
  const popup = document.getElementById('popup');
  popup.innerHTML = `
    <strong>${name}</strong><br/>
    <span style="color:#148F43;font-weight:500;">${fact}</span><br/>
    <em>${cert}</em><br/>
    <hr style="margin:9px 0;"/>
    <span style="color:#2ecc71;">Suggestion: ${suggestion}</span>
  `;
  popup.classList.add('visible');
  setTimeout(() => {
    popup.classList.remove('visible');
  }, 3200);
}

document.getElementById('analyze-btn').onclick = async function() {
  const title = document.getElementById('prod-title').value.trim();
  const desc = document.getElementById('prod-desc').value.trim();
  
  if (!title && !desc) {
    document.getElementById('ai-result').innerText = "Please enter a product title or description.";
    return;
  }
  
  document.getElementById('ai-result').innerText = "Gemini analyzing...";
  
  try {
    const prompt = `Analyze the following product for eco-friendliness. Is it eco-friendly? If yes, state one main eco feature; if no, briefly explain why not:
Title: ${title}
Description: ${desc}
`;
    
    // Use secure proxy instead of direct API call
    const response = await fetch('https://eco-shopping-assistant-demo.netlify.app/.netlify/functions/gemini-proxy', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    
    const data = await response.json();
    let aiMsg = "No response.";
    
    if (
      data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts &&
      data.candidates[0].content.parts[0] &&
      data.candidates[0].content.parts[0].text
    ) {
      aiMsg = data.candidates[0].content.parts[0].text;
    } else if (data.error) {
      aiMsg = "API error: " + data.error.message;
    }
    
    document.getElementById('ai-result').innerText = aiMsg;
  } catch (e) {
    document.getElementById('ai-result').innerText = "Error: " + (e.message || "Check Network Connection");
  }
};
