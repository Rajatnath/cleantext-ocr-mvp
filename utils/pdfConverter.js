// filepath: utils/pdfConverter.js
// Converts PDF files to images for OCR processing

/**
 * Convert a PDF file to an array of base64 images (one per page)
 * @param {File} file - PDF file object
 * @param {number} maxPages - Maximum number of pages to process (default: 10)
 * @returns {Promise<Array<{page: number, base64: string}>>}
 */
export async function convertPdfToImages(file, maxPages = 10) {
    if (typeof window === 'undefined' || !window.pdfjsLib) {
        throw new Error('PDF.js library not loaded');
    }

    try {
        // Read file as ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // Load PDF document
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const numPages = Math.min(pdf.numPages, maxPages);
        const images = [];

        // Process each page
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);

            // Set scale for reasonable quality (2.0 = good quality)
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

            // Convert canvas to base64
            const base64 = canvas.toDataURL('image/png', 0.8).split(',')[1];

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
        throw new Error('Failed to convert PDF to images: ' + error.message);
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
