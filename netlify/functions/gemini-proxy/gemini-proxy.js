const axios = require("axios");

// --- The Image Scout Function ---
async function getGoogleImage(keyword, apiKey) {
  try {
    const response = await axios.post(
      'https://google.serper.dev/images',
      {
        q: keyword,
        gl: 'in', // Geolocation: India
      },
      {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      }
    );
    const firstImage = response.data.images.find(img => img.imageUrl);
    return firstImage
      ? firstImage.imageUrl
      : "https://placehold.co/400x400/2c5364/e5e7eb?text=Image+Not+Found";
  } catch (error) {
    console.error(`[Serper] Image scraper failed for keyword: "${keyword}"`);
    if (error.response) {
      console.error('[Serper] Error Status:', error.response.status);
      console.error('[Serper] Error Data:', error.response.data);
    } else {
      console.error('[Serper] Network Error:', error.message);
    }
    return "https://placehold.co/400x400/2c5364/e5e7eb?text=Image+Error";
  }
}

// --- The Main Handler ---
exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    // Parse body
    const body = JSON.parse(event.body || "{}");
    const { category, title } = body;

    if (!title || !category) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Title and category are required." })
      };
    }

    // Retrieve keys from environment
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    const SERPER_KEY = process.env.SERPER_API_KEY;

    // Log keys for debug (Remove after testing for security)
    console.log("Gemini Key exists?", !!GEMINI_KEY);
    console.log("Serper Key exists?", !!SERPER_KEY);

    if (!GEMINI_KEY || !SERPER_KEY) {
      throw new Error("API keys are not configured.");
    }

    // --- Step 1: The AI Analyst ---
    const analystPrompt = `
      You are a senior product analyst. Analyze the user's product and create a research plan.
      **JSON Output Structure (MUST follow this exactly):**
      \`\`\`json
      {
        "productName": "User's Product Name",
        "isRecommended": false,
        "verdict": "A short, clear verdict.",
        "summary": "A detailed analysis in Markdown format.",
        "recommendationsTitle": "Better, Eco-Friendly Alternatives",
        "scoutKeywords": ["Stainless Steel Water Bottle", "Glass Water Bottle with Silicone Sleeve", "Handmade Copper Water Vessel"]
      }
      \`\`\`
      --- USER INPUT ---
      Category: ${category}
      Title: ${title}
    `;
    const modelUrl =
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;

    // Log the model URL for debugging
    console.log("Gemini Model URL:", modelUrl);

    let geminiAnalystResponse;
    try {
      geminiAnalystResponse = await axios.post(modelUrl, {
        contents: [{ parts: [{ text: analystPrompt }] }]
      });
    } catch (error) {
      console.error('[Gemini] Analyst API error!');
      if (error.response) {
        console.error('[Gemini] Error Status:', error.response.status);
        console.error('[Gemini] Error Data:', error.response.data);
      } else {
        console.error('[Gemini] Network Error:', error.message);
      }
      throw error;
    }

    const analystText = geminiAnalystResponse.data.candidates[0].content.parts.text;
    const analystResult = JSON.parse(
      analystText.replace(/``````/g, "").trim()
    );

    // --- Step 2: The Image Scouts ---
    const productScoutPromise = getGoogleImage(
      analystResult.productName,
      SERPER_KEY
    );
    const recommendationScoutPromises =
      (analystResult.scoutKeywords || []).map(keyword =>
        getGoogleImage(keyword, SERPER_KEY)
      );

    const [productImage, ...recommendationImages] = await Promise.all([
      productScoutPromise,
      ...recommendationScoutPromises
    ]);

    // --- Step 3: The AI Decorator ---
    const decoratorPrompt = `
      You are a creative assistant. For each of the following keywords, write a short, compelling description and generate a reliable Google search link for buying it in India.
      **JSON Output Structure (MUST follow this exactly):**
      \`\`\`json
      {
        "items": [
          {
            "name": "Stainless Steel Water Bottle",
            "description": "Durable, reusable, and keeps your drinks at the perfect temperature.",
            "link": "https://www.google.com/search?q=Stainless+Steel+Water+Bottle+buy+online+india"
          }
        ]
      }
      \`\`\`
      --- KEYWORD LIST TO DECORATE ---
      ${JSON.stringify(analystResult.scoutKeywords)}
    `;
    let geminiDecoratorResponse;
    try {
      geminiDecoratorResponse = await axios.post(modelUrl, {
        contents: [{ parts: [{ text: decoratorPrompt }] }]
      });
    } catch (error) {
      console.error('[Gemini] Decorator API error!');
      if (error.response) {
        console.error('[Gemini] Error Status:', error.response.status);
        console.error('[Gemini] Error Data:', error.response.data);
      } else {
        console.error('[Gemini] Network Error:', error.message);
      }
      throw error;
    }

    const decoratedItems = JSON.parse(
      geminiDecoratorResponse.data.candidates[0].content.parts.text
        .replace(/```
        .replace(/```/g, "")
        .trim()
    ).items;

    // Combine decorated text with images
    const finalItems = decoratedItems.map((item, index) => ({
      ...item,
      image: recommendationImages[index]
    }));

    // --- Final Assembly ---
    const finalResponse = {
      ...analystResult,
      productImage: productImage,
      recommendations: {
        title: analystResult.recommendationsTitle,
        items: finalItems,
      },
    };

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(finalResponse),
    };
  } catch (e) {
    console.error("Backend Error:", e.response ? e.response.data : e.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error:
          "An internal server error occurred: " +
          (e.response
            ? e.response.data.error
              ? e.response.data.error.message
              : JSON.stringify(e.response.data)
            : e.message),
      }),
    };
  }
};
