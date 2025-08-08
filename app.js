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
window.showPopup = (name, fact, cert) => {
  const popup = document.getElementById('popup');
  popup.innerHTML = `${name}<br/>${fact}<br/>${cert}`;
  popup.classList.add('visible');
  setTimeout(() => {
    popup.classList.remove('visible');
  }, 2500);
};

const products = [
  {
    name: "EcoBrush Bamboo Toothbrush",
    description: "A sustainable toothbrush made with biodegradable bamboo. Durable, plastic-free and vegan-friendly.",
    eco_fact: "100% biodegradable bamboo handle.",
    certification: "FSC Certified",
    suggestion: "Try our RePaper Recycled Notebook for a plastic-free writing experience."
  },
  {
    name: "GreenLiving Cotton Bag",
    description: "Reusable shopping bag crafted from organic cotton. Perfect for eco-conscious shopping trips.",
    eco_fact: "Reusable, organic cotton.",
    certification: "GOTS Certified",
    suggestion: "Pair with PureSip Glass Water Bottle for plastic-free hydration."
  },
  {
    name: "RePaper Recycled Notebook",
    description: "Notebook made from 100% recycled post-consumer paper. Great for students and writers.",
    eco_fact: "Made from 100% post-consumer recycled paper.",
    certification: "Blue Angel",
    suggestion: "Switch to EcoBrush for eco-friendly oral care."
  },
  {
    name: "PureSip Glass Water Bottle",
    description: "Reusable, BPA-free glass bottle. Stay hydrated and ditch single-use plastics.",
    eco_fact: "Reusable, BPA-free, and fully recyclable.",
    certification: "USDA Biobased",
    suggestion: "Carry with GreenLiving Cotton Bag for maximum sustainability."
  }
];
window.onload = () => {
  const list = document.getElementById('product-list');
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="icon.png" class="badge" alt="eco badge" title="Eco Friendly!" />
      <h3>${product.name}</h3>
      <p style="font-size:1em; color:#444; margin-bottom:0.5em;">${product.description}</p>
      <button onclick="showPopup('${product.name.replace(/'/g,"")}', '${product.eco_fact.replace(/'/g,"")}', '${product.certification.replace(/'/g,"")}', '${product.suggestion.replace(/'/g,"")}')">Why Eco?</button>
    `;
    list.appendChild(card);
  });
};
window.showPopup = (name, fact, cert, suggestion) => {
  const popup = document.getElementById('popup');
  popup.innerHTML = `
    <strong>${name}</strong><br>
    <span style="color:#148F43;font-weight:500;">${fact}</span><br>
    <em>${cert}</em><br>
    <hr style="margin:9px 0;">
    <span style="color:#2ecc71;">Suggestion: ${suggestion}</span>
  `;
  popup.classList.add('visible');
  setTimeout(() => {
    popup.classList.remove('visible');
  }, 3200);
};


