// filepath: utils/pdfConverter.js
// Converts PDF files to images for OCR processing

/**
 * Convert a PDF file to an array of base64 images (one per page)
 * 
 * WHY: We convert PDFs to images because:
 * 1. Most OCR engines (including Gemini Vision) are optimized for image input.
 * 2. It allows us to show a visual preview of exactly what is being scanned.
 * 3. It standardizes the input format for our OCR pipeline, regardless of source file type.
 * 
 * @param {File} file - PDF file object
 * @param {number} maxPages - Maximum number of pages to process (default: 10)
 * @returns {Promise<Array<{page: number, base64: string}>>}
 */
export async function convertPdfToImages(file, maxPages = 10) {
    // Only run on client side
    if (typeof window === 'undefined') {
        throw new Error('PDF conversion must run on client side');
    }

    try {
        // Dynamically import pdfjs-dist (client-side only)
        // WHY: pdfjs-dist is a large library. We use dynamic import to:
        // 1. Keep the initial bundle size small (lazy loading).
        // 2. Ensure this code only runs in the browser (it relies on DOM APIs like Canvas).
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker source to local public file
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const numPages = Math.min(pdf.numPages, maxPages);
        const images = [];

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            // Set scale for reasonable quality (2.0 = good quality)
            // WHY: A scale of 2.0 is chosen because:
            // 1. Standard PDF rendering at 1.0 is often too blurry for accurate OCR.
            // 2. 2.0 provides a good balance between clarity (for OCR accuracy) and performance/memory usage.
            // 3. Higher scales (e.g., 3.0+) might crash the browser on large documents due to canvas size limits.
            const scale = 2.0;
            const viewport = page.getViewport({ scale });

            // Create canvas
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Render PDF page to canvas
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext).promise;

            // Convert canvas to base64 (JPEG for smaller size)
            const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];

            images.push({
                page: pageNum,
                base64: base64,
                width: canvas.width,
                height: canvas.height
            });
        }

        return images;

    } catch (error) {
        console.error('PDF conversion error:', error);
        throw new Error('Failed to convert PDF: ' + error.message);
    }
}

/**
 * Get the first page of a PDF as an image for preview
 * @param {File} file - PDF file object
 * @returns {Promise<string>} - Base64 image string
 */
export async function getPDFPageOne(file) {
    if (typeof window === 'undefined') return null;

    try {
        const pdfjsLib = await import('pdfjs-dist');
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const scale = 1.0; // Lower scale for thumbnail
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: context, viewport }).promise;
        return canvas.toDataURL('image/jpeg', 0.7);
    } catch (error) {
        console.error('Thumbnail generation error:', error);
        return null;
    }
}

/**
 * Check if a file is a PDF
 * @param {File} file - File object
 * @returns {boolean}
 */
export function isPDF(file) {
    return file && file.type === 'application/pdf';
}

/**
 * Validate file for OCR processing
 * 
 * WHY: Front-end validation is crucial for UX and cost saving:
 * 1. It gives immediate feedback to the user without waiting for an upload.
 * 2. It prevents sending huge files that would timeout or exceed API limits.
 * 3. It ensures we only send supported formats to the backend, saving API costs.
 * 
 * @param {File} file - File object
 * @param {number} maxSizeBytes - Maximum file size in bytes (default: 8MB)
 * @returns {{valid: boolean, error: string}}
 */
export function validateFile(file, maxSizeBytes = 8 * 1024 * 1024) {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    if (file.size > maxSizeBytes) {
        return { valid: false, error: `File exceeds ${maxSizeBytes / (1024 * 1024)}MB limit` };
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type. Please upload JPG, PNG, GIF, or PDF' };
    }

    return { valid: true, error: null };
}
