/**
 * OCR Client Utilities
 * Handles communication with the backend proxy and local Tesseract instance.
 */

/**
 * Post to the serverless Gemini Vision proxy.
 * 
 * WHY: We use a proxy instead of calling Gemini directly from the client to:
 * 1. Secure the API key (never expose it to the browser).
 * 2. Handle complex error logic and potential fallbacks on the server side.
 * 3. Transform the response into a standardized format for the frontend.
 * 
 * @param {string} imageBase64 - The base64 encoded image string.
 * @param {boolean} forceFallback - Whether to force the fallback to PaddleOCR.
 * @returns {Promise<{text: string, source: string}>}
 */
export async function postToGemini(imageBase64, forceFallback = false) {
    try {
        const response = await fetch('/api/gemini-vision', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageBase64,
                // WHY: This prompt is carefully crafted to ensure:
                // 1. "Transcribe... exactly": We want OCR, not interpretation.
                // 2. "If it is handwritten...": Handles mixed media gracefully.
                // 3. "Do not add intro/outro": We want raw text output for the user, not a chat response.
                prompt: "Transcribe the text in this image exactly. If it is handwritten, decipher it naturally. Do not add intro/outro.",
                forceFallback,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        return {
            text: data.text,
            source: data.source,
        };
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}

/**
 * Post to PaddleOCR webhook (Client-side fallback if needed, but usually handled by server).
 * 
 * WHY: While the server currently handles fallbacks, this function exists to:
 * 1. Provide a mechanism for direct client-to-secondary-service calls if the proxy fails completely.
 * 2. Allow for future architectural changes where the client might orchestrate multiple OCR engines directly.
 */
export async function postToPaddle(imageBase64) {
    // Placeholder for direct Paddle interaction if architecture changes.
    // Currently, the /api/gemini-vision endpoint handles the fallback.
    return { text: "PaddleOCR fallback not implemented on client directly.", source: "client-paddle" };
}

/**
 * Run local Tesseract.js.
 * 
 * WHY: This serves as the "ultimate fallback" or "offline mode".
 * 1. It runs entirely in the browser (WebAssembly), so it works even if the backend is down.
 * 2. It provides immediate feedback for simple images without network latency.
 * 3. It's free, unlike the Gemini API, making it a cost-effective default for simple tasks if configured.
 * 
 * @param {string} imageBase64 - The base64 encoded image string.
 * @returns {Promise<{text: string, source: string}>}
 */
export async function postToTesseractLocal(imageBase64) {
    // We need to dynamically import Tesseract to avoid SSR issues if this runs on server
    // But this is a client utility.
    // Assuming Tesseract is loaded via script tag in the original HTML, 
    // but in Next.js we should probably install it or load it.
    // For the MVP based on the HTML provided, it used a script tag.
    // We will assume the user might want to install `tesseract.js` npm package eventually.
    // For now, we'll try to use the window.Tesseract if available (from script) or import it.

    // Since we are scaffolding, we'll just return a placeholder or try to use window.Tesseract
    if (typeof window !== 'undefined' && window.Tesseract) {
        const worker = await window.Tesseract.createWorker();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        const { data: { text } } = await worker.recognize(imageBase64);
        await worker.terminate();
        return { text, source: 'local-tesseract' };
    }

    return { text: "Tesseract not loaded", source: "error" };
}
