// This module will manage adding your affiliate tags to links.

// For now, we'll use a placeholder tag.
// In the future, you can add more complex logic for different sites.
const YOUR_AMAZON_TAG = "ecojinner-21"; // Example Amazon India tag

function addAffiliateTag(url) {
    if (!url) return url;

    try {
        const urlObj = new URL(url);
        if (urlObj.hostname.includes("amazon.in")) {
            urlObj.searchParams.set("tag", YOUR_AMAZON_TAG);
            return urlObj.toString();
        }
        // Add more rules for other sites like Flipkart here
        // if (urlObj.hostname.includes("flipkart.com")) { ... }

        // If no rule matches, return the original URL
        return url;
    } catch (error) {
        // If the URL is invalid, return it as is.
        console.error("Could not process URL for affiliate tag:", url);
        return url;
    }
}

module.exports = { addAffiliateTag };
