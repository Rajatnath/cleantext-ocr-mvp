// filepath: pages/index.js
// Research: file:///mnt/data/Digital Product Idea Generation Framework.docx
import { useRef, useState } from 'react';
import { convertPdfToImages, isPDF, validateFile } from '../utils/pdfConverter';

export default function Home() {
  const fileRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [retryVisible, setRetryVisible] = useState(false);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const MAX_BYTES = 8 * 1024 * 1024; // 8MB per file
  const MAX_PDF_PAGES = 10;

  function base64Bytes(b64) {
    return Math.ceil((b64.length * 3) / 4);
  }

  async function handleFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(true);
    setResult('');
    setRetryVisible(false);
    setFilePreviews([]);
    setUploadedFiles([]);

    const validFiles = [];
    const previews = [];

    for (const file of files) {
      const validation = validateFile(file, MAX_BYTES);
      if (!validation.valid) {
        alert(`${file.name}: ${validation.error}`);
        continue;
      }

      if (isPDF(file)) {
        // For PDF, create a generic preview
        previews.push({
          type: 'pdf',
          name: file.name,
          preview: null
        });
        validFiles.push(file);
      } else {
        // For images, create preview
        const reader = new FileReader();
        const preview = await new Promise((resolve) => {
          reader.onload = (event) => resolve(event.target.result);
          reader.readAsDataURL(file);
        });
        previews.push({
          type: 'image',
          name: file.name,
          preview: preview
        });
        validFiles.push(file);
      }
    }

    setUploadedFiles(validFiles);
    setFilePreviews(previews);
    setUploadingFiles(false);
  }

  function clearFiles() {
    setUploadedFiles([]);
    setFilePreviews([]);
    setResult('');
    setRetryVisible(false);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  async function processAllFiles() {
    if (uploadedFiles.length === 0) {
      return alert('Please upload at least one file');
    }

    setProcessing(true);
    setResult('');
    setRetryVisible(false);

    const allResults = [];

    try {
      for (let fileIndex = 0; fileIndex < uploadedFiles.length; fileIndex++) {
        const file = uploadedFiles[fileIndex];
        setCurrentFileIndex(fileIndex);
        setStatus(`Processing file ${fileIndex + 1} of ${uploadedFiles.length}: ${file.name}...`);

        if (isPDF(file)) {
          // Convert PDF to images
          setStatus(`Converting PDF pages for ${file.name}...`);
          const pages = await convertPdfToImages(file, MAX_PDF_PAGES);

          // Process each page
          for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            setStatus(`Processing ${file.name} - Page ${pageIndex + 1}/${pages.length}...`);

            const pageResult = await extractTextFromImage(pages[pageIndex].base64);
            allResults.push({
              fileName: file.name,
              page: pageIndex + 1,
              text: pageResult
            });
          }

        } else {
          // Process single image
          const reader = new FileReader();
          const base64 = await new Promise((resolve) => {
            reader.onload = (event) => {
              const dataUrl = event.target.result;
              const b64 = dataUrl.split(',')[1];
              resolve(b64);
            };
            reader.readAsDataURL(file);
          });

          const imageResult = await extractTextFromImage(base64);
          allResults.push({
            fileName: file.name,
            page: null,
            text: imageResult
          });
        }
      }

      // Combine all results with file/page separators
      const combinedResult = allResults.map((item, index) => {
        const header = item.page
          ? `═══ ${item.fileName} - Page ${item.page} ═══`
          : `═══ ${item.fileName} ═══`;
        return `${header}\n\n${item.text}`;
      }).join('\n\n' + '─'.repeat(60) + '\n\n');

      setResult(combinedResult);
      setStatus('');

    } catch (error) {
      console.error('Processing error:', error);
      setResult(`Error: ${error.message}`);
      setRetryVisible(true);
    } finally {
      setProcessing(false);
      setCurrentFileIndex(0);
    }
  }

  async function extractTextFromImage(base64Image) {
    if (base64Bytes(base64Image) > MAX_BYTES) {
      throw new Error('Image too large');
    }

    const resp = await fetch('/api/gemini-vision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: base64Image,
        prompt: `Transcribe all text from this image exactly as it appears. 
        
For mathematical formulas and equations:
- Use Unicode subscripts (₀₁₂₃₄₅₆₇₈₉) and superscripts (⁰¹²³⁴⁵⁶⁷⁸⁹) when possible
- For example: x₄ instead of x_4, x² instead of x^2
- Use standard operators: × for multiplication, ÷ for division, ≈ for approximately equal
- Use fractions in the form: (numerator)/(denominator)
- Preserve all mathematical structure and layout
- Do NOT use LaTeX markup like $$, $, \\frac, etc.

Return clean, readable plain text.`,
        forceFallback: false
      })
    });

    if (resp.status === 429) throw new Error('Rate limit exceeded');

    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Server error');

    return json.text || 'No text detected';
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-6xl bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-8 sm:px-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">CleanText OCR</h1>
          <p className="mt-2 text-indigo-100 text-sm">Extract text from images and PDFs with AI-powered precision</p>
          <p className="mt-1 text-indigo-200 text-xs opacity-75">Research: /mnt/data/Digital Product Idea Generation Framework.docx</p>
        </header>

        {/* Progress Bar */}
        {processing && (
          <div className="h-1 bg-gray-200 overflow-hidden">
            <div className="h-full bg-indigo-600 animate-pulse w-full"></div>
          </div>
        )}

        {/* Main Content */}
        <main className="p-6 sm:p-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column: Upload & Preview */}
            <div className="space-y-6">
              {/* Upload Section */}
              <section className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-400 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 relative">
                {uploadingFiles && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
                    <div className="text-center">
                      <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-200 border-t-indigo-600 mb-3"></div>
                      <p className="text-sm font-medium text-gray-700">Processing files...</p>
                      <p className="text-xs text-gray-500 mt-1">Reading and generating previews</p>
                    </div>
                  </div>
                )}
                <label htmlFor="file" className="block text-sm font-semibold text-gray-700 mb-3">
                  Upload Files (Multiple images or PDF)
                </label>
                <input
                  id="file"
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  onChange={handleFilesChange}
                  disabled={uploadingFiles || processing}
                  aria-label="Upload image files or PDF for OCR processing"
                  className="block w-full text-sm text-gray-600
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-600 file:text-white
                    hover:file:bg-indigo-700
                    file:cursor-pointer cursor-pointer
                    disabled:opacity-50 disabled:cursor-not-allowed
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                  💡 <strong>Supported:</strong> JPG, PNG, PDF | <strong>Max:</strong> 8MB per file | <strong>PDF:</strong> Up to {MAX_PDF_PAGES} pages
                </p>
              </section>

              {/* File Previews */}
              {filePreviews.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">
                      Uploaded Files ({filePreviews.length})
                    </h3>
                    <button
                      onClick={clearFiles}
                      className="text-xs text-red-600 hover:text-red-700 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {filePreviews.map((filePreview, index) => (
                      <div key={index} className="relative group">
                        {filePreview.type === 'pdf' ? (
                          <div className="aspect-square bg-red-50 rounded border border-red-200 flex items-center justify-center">
                            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                          </div>
                        ) : (
                          <img
                            src={filePreview.preview}
                            alt={filePreview.name}
                            className="aspect-square object-cover rounded border border-gray-200"
                          />
                        )}
                        <p className="mt-1 text-xs text-gray-600 truncate" title={filePreview.name}>
                          {filePreview.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="flex gap-3">
                <button
                  onClick={processAllFiles}
                  disabled={processing || uploadedFiles.length === 0}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-6 py-3 shadow text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center"
                >
                  {processing && (
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {processing ? 'Processing...' : `Extract Text from ${uploadedFiles.length} file(s)`}
                </button>
              </div>
            </div>

            {/* Right Column: Results */}
            <div className="flex flex-col">
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden flex flex-col h-full">
                {/* Header with Copy Button */}
                <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Extracted Text
                  </h2>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(result || '');
                    }}
                    disabled={!result}
                    aria-label="Copy extracted text to clipboard"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    Copy
                  </button>
                </div>

                {/* Textarea */}
                <div className="relative flex-1 min-h-[360px]">
                  <textarea
                    readOnly
                    value={result}
                    placeholder="Extracted text from all files will appear here..."
                    aria-label="Extracted text result"
                    aria-live="polite"
                    className="absolute inset-0 w-full h-full p-6 bg-gray-50 text-gray-800 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                  />
                  {!result && !processing && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center opacity-40">
                        <p className="text-gray-300 text-5xl font-serif italic mb-2">Abc</p>
                        <p className="text-gray-400 text-sm">Ready to extract text</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Stats */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-3 flex items-center justify-between text-xs text-gray-500">
                  <span>{result ? `${result.length} characters` : '0 characters'}</span>
                  <span>{uploadedFiles.length > 0 ? `${uploadedFiles.length} files uploaded` : 'No files uploaded'}</span>
                </div>
              </div>

              {/* Status Messages */}
              {status && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="mt-4 bg-indigo-50 border border-indigo-200 text-indigo-800 px-4 py-3 rounded-lg text-sm"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-indigo-600 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">{status}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
