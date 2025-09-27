import { CONFIG } from "./config.js";

/**
 * Listener to insert and execute the Content JS script
 */
chrome.action.onClicked.addListener((tab) => {
  // First try to ping content.js
  chrome.tabs.sendMessage(tab.id, { action: "toggleOverlay" }, (response) => {
    if (chrome.runtime.lastError) {
      // ❌ content.js not injected yet → inject it
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
      }, () => {
        // Tell it to start scanning
        chrome.tabs.sendMessage(tab.id, { action: "startScan" });
      });
    } else {
      // ✅ content.js is alive, overlay toggle handled inside content.js
    }
  });
});

/**
 * Listner for Classifying the Food Image
 */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      let payload;

      if (msg.action === "classifyImageUrl") {
        // Hugging Face request (image classification)
        payload = {
          provider: "huggingface",
          inputs: msg.imageUrl
        };
      } else if (msg.action === "getRecipe") {
        // Spoonacular request (recipe search)
        payload = {
          provider: "spoonacular",
          query: msg.query
        };
      }

      if (!payload) {
        throw new Error("Unsupported action: " + msg.action);
      }

      const result = await callLambdaApi(payload);
      sendResponse({ success: true, data: result });
    } catch (err) {
      console.error("Error calling Lambda API:", err);
      sendResponse({ success: false, error: err.message });
    }
  })();

  return true;
});


/**
 * Call Lambda Proxy API
 */
async function callLambdaApi(payload) {
  try {
    const response = await fetch(CONFIG.LAMBDA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": CONFIG.LAMBDA_API_KEY,  // API Gateway authentication
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`API failed: ${response.status} ${response.statusText}`);
    }

    // Read the body only once
    const data = await response.json();  
    return data;
  }catch (err) {
    console.error("API call failed:", err);
    return { error: err.message };
  }
}
