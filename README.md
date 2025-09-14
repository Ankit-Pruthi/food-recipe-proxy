🍽️ Food Recipe Proxy (Chrome Extension + AWS Lambda)

This project provides a Chrome Extension that classifies food images using Hugging Face models and fetches recipes from Spoonacular API, all securely routed through an AWS Lambda proxy.
The proxy hides API keys from the client, ensuring secure calls.

📂 Project Structure
food-recipe-proxy/
│── chrome-extension/        # Chrome extension code
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── config.js (ignored, use config.sample.js)
│   └── assets/
│
│── lambda/                  # AWS Lambda (SAM-based) proxy
│   ├── index.js
│   ├── template.yaml
│   ├── package.json
│   └── .env (ignored)
│
│── .gitignore
│── README.md

⚡ Features

✅ Classifies food images with Hugging Face AI models.
✅ Fetches recipes using Spoonacular API.
✅ Protects API keys by routing requests through AWS Lambda.
✅ Chrome Extension UI overlay to show results.
✅ API Gateway authentication using API Key.
✅ Origin validation — only the extension can access Lambda.

🛠️ Setup
1. Clone Repo
    git clone https://github.com/<your-username>/food-recipe-proxy.git
    cd food-recipe-proxy

2. Lambda Setup
    cd lambda
    npm install

    => Create a .env file:
        HUGGING_FACE_API_KEY=your_hf_key
        SPOONACULAR_API_KEY=your_spoonacular_key

    => Deploy using AWS SAM:
        sam build
        sam deploy --guided

    This will create the Lambda + API Gateway and give you an API endpoint + API key.

3. Chrome Extension Setup

    => Copy chrome-extension/config.sample.js → chrome-extension/config.js

    => Update with your Lambda details:
        export const CONFIG = {
        LAMBDA_API_URL: "https://xxxxxx.execute-api.region.amazonaws.com/Prod/hfproxy",
        LAMBDA_API_KEY: "your_lambda_api_key"
        };

    => Load the extension:

        Open Chrome → Extensions → Enable Developer Mode.
        Click Load Unpacked → Select chrome-extension/.

🚀 Usage

    => Click the extension icon in Chrome.

    => Select an image on the webpage.

    => The extension calls Lambda → Hugging Face / Spoonacular → displays results (e.g., Garlic Bread → recipe suggestions).

🔒 Security Notes

    => API keys are not stored in the extension; they are hidden behind Lambda.

    => config.js is .gitignore’d to prevent leaks.

    => Lambda validates requests to only allow calls from this Chrome extension.

📸 Screenshots

    => Add screenshots of extension popup + results UI here.

📦 Publishing to Chrome Web Store

    => Zip the chrome-extension/ folder:

        cd chrome-extension
        zip -r ../chrome-extension.zip .

    => Upload chrome-extension.zip to Chrome Web Store Developer Dashboard.

    => Provide description, icon (128x128), and privacy policy.

    => Submit for review.

🧑‍💻 Author
Ankit Pruthi