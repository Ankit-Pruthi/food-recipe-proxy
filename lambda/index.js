// Lambda handler
exports.lambdaHandler = async (event) => {
  try {

    // ✅ Validate Origin header
    const chromeExtId_Prod = process.env.CHROME_EXTN_ID_PROD;
    const chromeExtId_Local = process.env.CHROME_EXTN_ID_LOCAL;

    const allowedOrigins = [`chrome-extension://${chromeExtId_Prod}`, `chrome-extension://${chromeExtId_Local}`];
    const origin = event.headers?.origin || event.headers?.Origin;
    const allowOrigin = allowedOrigins.includes(origin) ? origin : '';

    const corsHeaders_PreFlight = {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Max-Age': '3600'
      };

    // Handle preflight
    if (event.httpMethod === 'OPTIONS') {
      return {
        statusCode: 200,
        headers: corsHeaders_PreFlight
      };
    }

    if (!origin || !allowedOrigins.includes(origin)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Forbidden: Invalid Origin" }),
      };
    }

    const corsHeaders_Post = {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Methods': 'OPTIONS,POST',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization'
      };

    let payload;

    try {
      payload = event.body ? JSON.parse(event.body) : event;
    } catch (err) {
      return { statusCode: 400, headers: corsHeaders_Post, body: JSON.stringify({ error: "Invalid JSON" }) };
    }

    const provider = payload.provider?.toLowerCase();
    if (!provider) {
      return { statusCode: 400, headers: corsHeaders_Post, body: JSON.stringify({ error: "Missing provider" }) };
    }

    try {
      if (provider === "huggingface") {
        const result = await callHuggingFace(payload.inputs);
        return { statusCode: 200, headers: corsHeaders_Post, body: JSON.stringify(result) };

      } else if (provider === "spoonacular") {
        const result = await callSpoonacular(payload.query);
        return { statusCode: 200, headers: corsHeaders_Post, body: JSON.stringify(result) };

      } else {
        return { statusCode: 400, headers: corsHeaders_Post, body: JSON.stringify({ error: "Unknown provider" }) };
      }
    } catch (err) {
      console.error("Lambda Error:", err);
      return { statusCode: 500, headers: corsHeaders_Post, body: JSON.stringify({ error: "Internal server error", details: err.message }) };
    }
  } catch (err) {
      console.error("Lambda Error:", err);
      return { statusCode: 403, headers: corsHeaders_Post, body: JSON.stringify({ error: "Not Authorized", details: "Not Authorized" }) };
  }
};

/**
 * Call Hugging Face API
 * @param {string} input - text or image URL
 * @returns {object} standardized response
 */
async function callHuggingFace(input) {
  const HF_API_KEY = process.env.HUGGING_FACE_API_KEY;

  // If input is an image URL, convert to base64
  const payload = input.startsWith("http") ? await fetchImageAsBase64(input) : input;

  const resp = await fetch("https://router.huggingface.co/hf-inference/models/nateraw/food", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${HF_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ inputs: payload })
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { provider: "huggingface", item: "non-food", error: `HF API error ${resp.status}: ${text}` };
  }

  const results = await resp.json();
  if (!Array.isArray(results) || results.length === 0) {
    return { provider: "huggingface", item: "non-food", error: "No prediction" };
  }

  const filtered = results.filter(r => r.score > 0.5);
  if (filtered.length === 0) {
    return { provider: "huggingface", item: "non-food", error: "No prediction > 0.5" };
  }

  const best = filtered.reduce((best, current) => (current.score > best.score ? current : best));
  return { provider: "huggingface", item: "food", prediction: best };
}

/**
 * Call Spoonacular API
 * @param {string} query - food query
 * @returns {object} standardized response
 */
async function callSpoonacular(query) {
  const SPOON_API_KEY = process.env.SPOONACULAR_API_KEY;
  const query_spoon = "Recipe for " + query.replace(/_/g, " ");

  const url = `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query_spoon)}&number=3&addRecipeInformation=true&apiKey=${SPOON_API_KEY}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    const text = await resp.text();
    return { provider: "spoonacular", recipes: [], error: `Spoonacular API error ${resp.status}: ${text}` };
  }

  const data = await resp.json();
  const recipes = (data.results || []).map(recipe => {
    const steps = recipe.summary
      ? recipe.summary.replace(/<\/?[^>]+(>|$)/g, "").split(". ").filter(s => s.trim().length > 0)
      : [];
    return {
      title: recipe.title,
      image: recipe.image,
      vegetarian: recipe.vegetarian ? "Vegetarian 🥦" : "Non-Vegetarian 🍗",
      healthScore: recipe.healthScore || "N/A",
      steps
    };
  });

  return { provider: "spoonacular", recipes };
}

// Helper: fetch image URL and return base64
async function fetchImageAsBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Image fetch failed: ${resp.status}`);
  const buffer = await resp.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:image/jpeg;base64,${base64}`;
}