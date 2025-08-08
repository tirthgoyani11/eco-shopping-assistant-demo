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
      <img src="icon.png" class="badge" alt="eco badge" title="Eco Friendly!" />
      <h3>${product.name}</h3>
      <button onclick="showPopup('${product.name.replace(/'/g,"")}', '${product.eco_fact.replace(/'/g,"")}', '${product.certification.replace(/'/g,"")}')">Why Eco?</button>
    `;
    list.appendChild(card);
  });
};

window.showPopup = (name, fact, cert) => {
  const popup = document.getElementById('popup');
  popup.innerHTML = `<strong>${name}</strong><br>${fact}<br><em>${cert}</em>`;
  popup.classList.add('visible');
  setTimeout(() => {
    popup.classList.remove('visible');
  }, 2500);
};
