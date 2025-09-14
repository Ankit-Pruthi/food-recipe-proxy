(() => {
  let foodImages = [];
  // Max images to classify
  const MAX_IMAGES = 6;
  let classifiedCount = 0;
  let pendingRequests = 0;


  // Called when classification succeeds
  function addFoodItem(src, label) {
    if (!foodImages.some(f => f.src === src)) {
      foodImages.push({ src, label });
      renderFoodList();
    }
  }

  // Render food list in overlay
  function renderFoodList() {
    const list = document.querySelector("#food-list");
    if (!list) return;

    list.innerHTML = ""; // clear

    foodImages.forEach((item, index) => {
      const div = document.createElement("div");
      div.style.display = "flex";
      div.style.alignItems = "center";
      div.style.marginBottom = "8px";

      const img = document.createElement("img");
      img.src = item.src;
      img.style.width = "40px";
      img.style.height = "40px";
      img.style.objectFit = "cover";
      img.style.marginRight = "8px";
      img.style.borderRadius = "4px";

      const label = document.createElement("span");
      label.textContent = item.label;
      label.style.flex = "1";

      const btn = document.createElement("button");
      btn.textContent = "Get Recipe";
      btn.onclick = () => fetchRecipes(item.label);

      div.appendChild(img);
      div.appendChild(label);
      div.appendChild(btn);

      list.appendChild(div);
    });

    if (foodImages.length === 0) {
      list.innerHTML = `<div style="padding:10px; color:#555;">No food found.</div>`;
    }
  }

  // Reset and rescans the images on the page
  function resetAndRescan() {
    foodImages = [];
    classifiedCount = 0;

    // Clear UI
    const list = document.querySelector("#food-list");
    if (list) list.innerHTML = "";

    // Start scanning again
    startFoodScan();
  }

  // Start the Food scanning for each image
  function startFoodScan() {
    // Ensure overlay exists before scanning
    ensureOverlay();

    document.querySelectorAll("img").forEach(img => {
      if (classifiedCount >= MAX_IMAGES) return;

      if (img.src && img.naturalWidth > 50) {
        classifyImage(img);
        classifiedCount++;
      }
    });
  }

  // Classification request
  function classifyImage(img) {
    pendingRequests++;
    chrome.runtime.sendMessage(
      { action: "classifyImageUrl", imageUrl: img.src },
      (response) => {
        pendingRequests--;

        if (chrome.runtime.lastError) {
          console.error("Message error:", chrome.runtime.lastError.message);
          checkIfLoadingDone();
          return;
        }

        if (response?.data && response.data.item?.toLowerCase() === "food") {
          if(response.data?.prediction){
            let foodLabel = formatFoodItem(response.data?.prediction.label);
            addFoodItem(img.src, foodLabel.toLowerCase());
          }
        }

        checkIfLoadingDone();
      }
    );
  }

  // Load overlay HTML
  function ensureOverlay() {
    // if (document.getElementById("food-finder-overlay")) return;
    console.log("Injecting overlay...");

    // remove existing overlay if present
    const old = document.getElementById("food-finder-overlay");
    if (old) old.remove();

    // reset state when overlay is recreated
    foodImages = [];
    classifiedCount = 0;

    fetch(chrome.runtime.getURL("overlay.html"))
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const overlay = doc.querySelector("#food-finder-overlay");

        // Inject overlay CSS if not already present
        if (!document.getElementById("food-finder-overlay-style")) {
          const styleLink = document.createElement("link");
          styleLink.id = "food-finder-overlay-style";
          styleLink.rel = "stylesheet";
          styleLink.type = "text/css";
          styleLink.href = chrome.runtime.getURL("overlay.css");
          document.head.appendChild(styleLink);
        }

        document.body.append(overlay);

        document.getElementById("closeOverlay").onclick = () => overlay.remove();

        // Show loading initially
        const list = document.getElementById("food-list");
        if (list) {
          list.innerHTML = `<div id="loading">
            <span>⏳ Scanning images for food...</span>
          </div>`;
        }
      });
  }

  // Show/hide overlay toggle
  function toggleOverlay() {
    const overlay = document.getElementById("food-finder-overlay");
    if (overlay) {
      overlay.style.display =
        overlay.style.display === "none" ? "block" : "none";
    }
  }

  //Checks if Loading is complete, then renders the food items list
  function checkIfLoadingDone() {
    if (pendingRequests === 0) {
      const loadingEl = document.getElementById("loading");
      if (loadingEl) loadingEl.remove();
      renderFoodList();
    }
  }

  // Fetch recipes from background.js
  function fetchRecipes(query) {
    chrome.runtime.sendMessage({ action: "getRecipe", query }, (response) => {
      if (response?.data && response.data?.recipes) {
        showRecipes(response.data.recipes[0]);  // single recipe string
      } else {
        alert("No recipe found.");
      }
    });
  }

  // Show recipes view
  function showRecipes(recipe) {
    document.querySelector("#food-list").style.display = "none";
    const recipesView = document.querySelector("#recipes-view");
    recipesView.style.display = "block";

    const container = document.querySelector("#recipes-list");
    container.innerHTML = "";

    // Recipe card wrapper
    const div = document.createElement("div");
    div.className = "recipe-card";

    // Title
    const title = document.createElement("h2");
    title.textContent = recipe.title;
    div.appendChild(title);

    // Image
    if (recipe.image) {
      const img = document.createElement("img");
      img.src = recipe.image;
      img.alt = recipe.title;
      div.appendChild(img);
    }

    // Veg/Non-Veg
    const type = document.createElement("p");
    type.innerHTML = `<strong>Type:</strong> ${recipe.vegetarian ? "Vegetarian 🥦" : "Non-Vegetarian  🍗"}`;
    div.appendChild(type);

    // Health Score
    const health = document.createElement("p");
    health.innerHTML = `<strong>Health Score:</strong> ${recipe.healthScore}`;
    div.appendChild(health);

    // Steps
    if (recipe.steps && recipe.steps.length > 0) {
      const stepsTitle = document.createElement("h3");
      stepsTitle.textContent = "Steps:";
      div.appendChild(stepsTitle);

      const ol = document.createElement("ol");
      recipe.steps.forEach(s => {
        const li = document.createElement("li");
        li.textContent = s;
        ol.appendChild(li);
      });
      div.appendChild(ol);
    }

    container.appendChild(div);
  }

  // Back button handler
  document.addEventListener("click", (e) => {
     if (e.target.id === "resetScanFood") {
      resetAndRescan();
    }
    if (e.target.id === "backToFoods") {
      document.querySelector("#recipes-view").style.display = "none";
      document.querySelector("#food-list").style.display = "block";
    }
    if (e.target.id === "closeOverlay") {
      document.getElementById("food-finder-overlay")?.remove();
    }
  });

  // 👇 Listen for "startScan" message from background
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "startScan") {
      startFoodScan();
    }
    if (msg.action === "toggleOverlay") {
      toggleOverlay();
    }
  });

  // Convert "garlic_bread" → "Garlic Bread"
  function formatFoodItem(str) {
    if (!str) return "";
    return str
      .split('_') // split by underscore
      .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // capitalize
      .join(' '); // join with space
  }

})();