/**
 * OCR Client Utilities
 * Handles communication with the backend proxy and local Tesseract instance.
 */

/**
 * Post to the serverless Gemini Vision proxy.
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
 * Note: The requirements say the server handles fallback, but this is here just in case
 * or if we want a direct client fallback mode later. 
 * For now, we'll assume the server proxy handles it as per requirements.
 * This function might be used if we want to bypass the proxy entirely.
 */
export async function postToPaddle(imageBase64) {
    // Placeholder for direct Paddle interaction if architecture changes.
    // Currently, the /api/gemini-vision endpoint handles the fallback.
    return { text: "PaddleOCR fallback not implemented on client directly.", source: "client-paddle" };
}

/**
 * Run local Tesseract.js.
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
