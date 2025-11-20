// filepath: pages/index.js
// Research: file:///mnt/data/Digital Product Idea Generation Framework.docx
import { useRef, useState } from 'react';

export default function Home() {
  const fileRef = useRef(null);
  const canvasRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [result, setResult] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [base64Image, setBase64Image] = useState(null);
  const [retryVisible, setRetryVisible] = useState(false);

  const MAX_BYTES = 8 * 1024 * 1024; // 8MB

  function base64Bytes(b64) {
    return Math.ceil((b64.length * 3) / 4);
  }

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      alert('File too large. Please upload <= 8MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const b64 = dataUrl.split(',')[1];
      setBase64Image(b64);
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const maxW = 1200;
        const scale = Math.min(1, maxW / img.width);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setShowPreview(true);
        setResult('');
        setRetryVisible(false);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(f);
  }

  async function runStandardOCR() {
    if (!base64Image) return alert('Upload an image first.');
    setProcessing(true);
    setStatus('Initializing OCR engine...');
    setResult('');

    let worker = null;
    try {
      // Create a smaller canvas for faster OCR processing
      const sourceCanvas = canvasRef.current;
      const maxDimension = 1000; // Reduce from 1200 for faster processing
      const scale = Math.min(1, maxDimension / Math.max(sourceCanvas.width, sourceCanvas.height));

      const ocrCanvas = document.createElement('canvas');
      ocrCanvas.width = sourceCanvas.width * scale;
      ocrCanvas.height = sourceCanvas.height * scale;
      const ctx = ocrCanvas.getContext('2d');
      ctx.drawImage(sourceCanvas, 0, 0, ocrCanvas.width, ocrCanvas.height);
      const dataUrl = ocrCanvas.toDataURL('image/png', 0.8); // Lower quality for speed

      // Create and initialize worker with CDN paths for faster loading
      setStatus('Downloading OCR engine (first time only)...');
      worker = await Tesseract.createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            setStatus(`Recognizing text: ${Math.round(m.progress * 100)}%`);
          } else if (m.status === 'loading tesseract core') {
            setStatus('Loading engine...');
          } else if (m.status === 'initializing tesseract') {
            setStatus('Initializing...');
          } else if (m.status === 'loading language traineddata') {
            setStatus('Downloading language data (one-time, ~4MB)...');
          } else if (m.status) {
            setStatus(m.status);
          }
        },
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v5/tesseract-core.wasm.js',
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
      });

      await worker.loadLanguage('eng');
      await worker.initialize('eng');

      setStatus('Processing image... (may take 10-30 seconds)');
      const { data } = await worker.recognize(dataUrl);
      setResult(data.text.trim() || 'No text detected');

    } catch (err) {
      console.error('OCR Error:', err);
      setResult('Local OCR failed: ' + (err.message || String(err)) + '\n\nTry "Deep Scan (AI)" for faster results!');
    } finally {
      if (worker) {
        try {
          await worker.terminate();
        } catch (e) {
          console.error('Worker termination error:', e);
        }
      }
      setProcessing(false);
      setStatus('');
    }
  }

  async function runDeepScan(forceFallback = false) {
    if (!base64Image) return alert('Upload an image first.');
    if (base64Bytes(base64Image) > MAX_BYTES) return alert('Image too large.');
    setProcessing(true);
    setStatus(forceFallback ? 'Using fallback OCR...' : 'Uploading securely to OCR pipeline...');
    setResult('');
    setRetryVisible(false);
    try {
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
          forceFallback
        })
      });
      if (resp.status === 429) throw new Error('rate_limit_exceeded');
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error || 'server_error');
      setResult(json.text || '');
      if (json.source === 'paddle_fallback') {
        setStatus('Used fallback OCR (Paddle). Results may take longer.');
        setTimeout(() => setStatus(''), 3500);
      }
    } catch (err) {
      setResult('Error: ' + (err.message || String(err)));
      setRetryVisible(true);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-6xl bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-8 sm:px-8">
          <h1 className="text-3xl font-bold text-white tracking-tight">CleanText OCR</h1>
          <p className="mt-2 text-indigo-100 text-sm">Extract text from images with AI-powered precision</p>
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
              <section className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-indigo-400 transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
                <label htmlFor="file" className="block text-sm font-semibold text-gray-700 mb-3">
                  Upload Image
                </label>
                <input
                  id="file"
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  aria-label="Upload image file for OCR processing"
                  className="block w-full text-sm text-gray-600
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-indigo-600 file:text-white
                    hover:file:bg-indigo-700
                    file:cursor-pointer cursor-pointer
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                />
                <p className="mt-3 text-xs text-gray-500 leading-relaxed">
                  💡 <strong>Photo tips:</strong> Use good lighting, hold device steady, capture text straight-on at close distance for best results.
                </p>
              </section>

              {/* Preview Card */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" style={{ minHeight: '360px' }}>
                <div className="relative h-full min-h-[360px] flex items-center justify-center bg-gray-50">
                  {!showPreview && (
                    <div className="text-center p-8">
                      <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mt-3 text-sm font-medium text-gray-400">No image uploaded</p>
                      <p className="mt-1 text-xs text-gray-400">Upload an image to preview</p>
                    </div>
                  )}
                  <canvas
                    ref={canvasRef}
                    className={`${showPreview ? 'block' : 'hidden'} max-w-full h-auto object-contain`}
                  />
                </div>

                {/* Action Buttons */}
                <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex flex-wrap gap-3">
                  <button
                    onClick={() => runDeepScan(false)}
                    disabled={processing}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-md px-4 py-2 shadow text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all inline-flex items-center"
                  >
                    {processing && (
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    )}
                    {processing ? 'Processing...' : 'Extract Text (AI)'}
                  </button>
                  {retryVisible && (
                    <button
                      onClick={() => runDeepScan(true)}
                      disabled={processing}
                      className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Retry with Fallback
                    </button>
                  )}
                </div>
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
                    aria-label="Copy extracted text to clipboard"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                    placeholder="Extracted text will appear here..."
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
                  <span>{result ? '✓ Complete' : 'Awaiting input'}</span>
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
