/**
 * Netlify Function: discover-content.js
 * --------------------------------------
 * This function simulates a backend that provides dynamic content
 * for the "Discover" page. It returns a structured JSON object
 * with featured products and filterable product grids.
 */

exports.handler = async function(event, context) {
    // In a real application, this data would come from a database.
    const discoverData = {
        editorsPicks: [
            {
                id: 1,
                name: "Handmade Clay Water Bottle",
                brand: "MittiCool",
                description: "A natural and traditional way to keep water cool. Made by local Indian artisans.",
                image: "https://placehold.co/600x400/D2691E/white?text=Clay+Bottle",
                tags: ["Kitchen", "Made in India", "Plastic-Free"]
            }
        ],
        products: [
            {
                id: 2,
                name: "Organic Cotton Tote Bag",
                brand: "EcoBags",
                description: "Durable and stylish, perfect for groceries and daily use. GOTS certified.",
                image: "https://placehold.co/600x400/8FBC8F/white?text=Tote+Bag",
                tags: ["Fashion", "Organic"]
            },
            {
                id: 3,
                name: "Bamboo Toothbrush Set (4-pack)",
                brand: "BrushWithBamboo",
                description: "A zero-waste alternative to plastic toothbrushes. Biodegradable handles.",
                image: "https://placehold.co/600x400/228B22/white?text=Toothbrushes",
                tags: ["Personal Care", "Plastic-Free"]
            },
            {
                id: 4,
                name: "Stainless Steel Reusable Straws",
                brand: "SteelSip",
                description: "Comes with a cleaning brush and a travel pouch. Say no to single-use plastic.",
                image: "https://placehold.co/600x400/708090/white?text=Steel+Straws",
                tags: ["Kitchen", "Plastic-Free"]
            },
            {
                id: 5,
                name: "Khadi Face Mask",
                brand: "Gramodyog",
                description: "Handwoven, breathable, and reusable face masks made from Khadi fabric.",
                image: "https://placehold.co/600x400/E6E6FA/black?text=Khadi+Mask",
                tags: ["Personal Care", "Made in India"]
            },
             {
                id: 6,
                name: "Vegan Leather Wallet",
                brand: "Arture",
                description: "A cruelty-free wallet made from innovative cork fabric. PETA-approved vegan.",
                image: "https://placehold.co/600x400/A0522D/white?text=Vegan+Wallet",
                tags: ["Fashion", "Vegan"]
            }
        ]
    };

    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*", // Allow requests from any origin
        },
        body: JSON.stringify(discoverData),
    };
};
