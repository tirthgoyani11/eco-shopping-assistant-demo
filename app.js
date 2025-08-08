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
