# CleanText OCR MVP

A secure, end-to-end OCR web app using Next.js, serverless proxy, and fallback OCR webhook.

## Deployment Instructions

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Locally**
    ```bash
    npm run dev
    ```

3.  **Configure Environment**
    Create a `.env.local` file with your keys:
    ```bash
    GEMINI_KEY=your_gemini_key
    PADDLE_HOOK=your_paddle_webhook_url
    ```

4.  **Deploy to Vercel**
    Deploy using the Vercel CLI or dashboard. Ensure environment variables are set in the project settings.

## Features
- File upload (max 8MB)
- Local Tesseract.js OCR
- AI-powered OCR via Gemini Vision (Serverless Proxy)
- Fallback to PaddleOCR
- Secure API key handling (no keys exposed to client)
