import { useRef, useState } from 'react';
import { convertPdfToImages, isPDF, validateFile, getPDFPageOne } from '../utils/pdfConverter';
import FilePreview from '../components/FilePreview';
import StatusBar from '../components/StatusBar';
import Alerts from '../components/Alerts';

export default function Home() {
  const fileRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [pdfConverting, setPdfConverting] = useState(false);
  const [pdfConversionStatus, setPdfConversionStatus] = useState('');

  // New granular status state
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);

  const [result, setResult] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const MAX_BYTES = 50 * 1024 * 1024; // 50MB per file
  const MAX_PDF_PAGES = 50;

  function base64Bytes(b64) {
    return Math.ceil((b64.length * 3) / 4);
  }

  async function handleFilesChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadingFiles(true);
    setError(null);
    setResult('');
    setFilePreviews([]);
    setUploadedFiles([]);

    // Simulate upload delay so the animation is visible
    await new Promise(resolve => setTimeout(resolve, 2000));

    const validFiles = [];
    const previews = [];

    for (const file of files) {
      const validation = validateFile(file, MAX_BYTES);
      if (!validation.valid) {
        setError({ message: `${file.name}: ${validation.error}` });
        continue;
      }

      if (isPDF(file)) {
        // Generate thumbnail for PDF
        let thumbnail = null;
        try {
          thumbnail = await getPDFPageOne(file);
        } catch (err) {
          console.error('Error generating PDF thumbnail:', err);
        }

        previews.push({
          type: 'pdf',
          name: file.name,
          preview: thumbnail, // Now using real thumbnail
          pageCount: null // We could get this if we fully parsed it, but keeping it simple for now
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
    setError(null);
    setStatus('');
    setProgress(0);
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  function removeFile(fileToRemove) {
    const index = filePreviews.findIndex(f => f.name === fileToRemove.name);
    if (index === -1) return;

    const newPreviews = [...filePreviews];
    newPreviews.splice(index, 1);

    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);

    setFilePreviews(newPreviews);
    setUploadedFiles(newFiles);
  }

  async function processAllFiles() {
    if (uploadedFiles.length === 0) {
      return setError({ message: 'Please upload at least one file' });
    }

    setProcessing(true);
    setResult('');
    setError(null);
    setProgress(0);

    const allResults = [];
    const totalSteps = uploadedFiles.length * 2; // Rough estimate: convert + extract per file
    let currentStep = 0;

    try {
      for (let fileIndex = 0; fileIndex < uploadedFiles.length; fileIndex++) {
        const file = uploadedFiles[fileIndex];
        setCurrentFileIndex(fileIndex);

        // Update status
        setStatus(`Processing ${file.name}...`);

        if (isPDF(file)) {
          // Convert PDF to images
          setPdfConverting(true);
          setPdfConversionStatus(`Converting PDF: ${file.name}...`);
          setStatus(`Converting PDF: ${file.name}...`);

          // Small delay to allow React to render
          await new Promise(resolve => setTimeout(resolve, 100));

          const pages = await convertPdfToImages(file, MAX_PDF_PAGES);
          setPdfConverting(false);

          currentStep++;
          setProgress((currentStep / totalSteps) * 100);

          // Process each page
          for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
            setStatus(`Extracting text from ${file.name} (Page ${pageIndex + 1}/${pages.length})...`);

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

          setStatus(`Extracting text from ${file.name}...`);
          const imageResult = await extractTextFromImage(base64);
          allResults.push({
            fileName: file.name,
            page: null,
            text: imageResult
          });
        }

        currentStep++;
        setProgress((currentStep / totalSteps) * 100);
      }

      // Combine all results with file/page separators
      const combinedResult = allResults.map((item) => {
        const header = item.page
          ? `═══ ${item.fileName} - Page ${item.page} ═══`
          : `═══ ${item.fileName} ═══`;
        return `${header}\n\n${item.text}`;
      }).join('\n\n' + '─'.repeat(60) + '\n\n');

      setResult(combinedResult);
      setStatus('Extraction complete!');
      setProgress(100);

    } catch (error) {
      console.error('Processing error:', error);
      setError({
        message: error.message,
        code: error.message.includes('429') ? 'rate_limit_exceeded' : 'processing_error'
      });
      setStatus('');
    } finally {
      setProcessing(false);
      setCurrentFileIndex(0);
      setPdfConverting(false);
      // Clear status after a delay if successful
      if (!error) {
        setTimeout(() => setStatus(''), 3000);
      }
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

    if (resp.status === 429) throw new Error('Rate limit exceeded. Please try again in a minute.');

    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Server error');

    return json.text || 'No text detected';
  }

  return (
    <div className="min-h-screen flex flex-col py-8 px-4 sm:px-6 lg:px-8 font-sans text-neutral-900">
      {/* Loading Overlay - Shows ONLY during file upload */}
      {uploadingFiles && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-black mb-4"></div>
            <h3 className="text-lg font-medium text-neutral-900">Uploading Files</h3>
            <p className="text-sm text-neutral-500">Please wait...</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <header className="mb-10 flex items-center">
          <div className="w-1 h-10 bg-black mr-5 rounded-full"></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 font-sans">CleanText OCR</h1>
            <p className="mt-1 text-neutral-500 text-base">Extract text from images and PDFs with precision.</p>
          </div>
        </header>

        {/* Main Content - Asymmetric Grid */}
        <main className="grid lg:grid-cols-12 gap-8 items-start">

          {/* Left Panel: Upload & Preview (Wider - 7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Upload Section */}
            <section className="group relative">
              <div className="relative bg-white border-2 border-dashed border-neutral-300 rounded-lg p-8 transition-all duration-150 hover:border-neutral-400 hover:bg-neutral-50/50 hover:scale-[1.01]">
                <label htmlFor="file" className="block cursor-pointer w-full h-full">
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-150">
                      <svg className="w-6 h-6 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <span className="text-lg font-medium text-neutral-900">Upload files</span>
                    <span className="mt-1 text-sm text-neutral-500">Drop PDF or images anywhere</span>
                  </div>
                  <input
                    id="file"
                    ref={fileRef}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    onChange={handleFilesChange}
                    disabled={uploadingFiles || processing}
                    className="hidden"
                  />
                </label>
              </div>
            </section>

            {/* Alerts */}
            <Alerts error={error} onDismiss={() => setError(null)} />

            {/* File Previews */}
            {(filePreviews.length > 0) && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-medium text-neutral-900">
                    {filePreviews.length} file{filePreviews.length !== 1 ? 's' : ''} selected
                  </h3>
                  <button
                    onClick={clearFiles}
                    className="text-sm text-neutral-500 hover:text-red-600 transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filePreviews.map((filePreview, index) => (
                    <FilePreview
                      key={index}
                      file={filePreview}
                      onRemove={removeFile}
                    />
                  ))}
                </div>

                {/* Status Bar */}
                <StatusBar status={status} progress={progress} processing={processing} />

                {/* Action Button */}
                <button
                  onClick={processAllFiles}
                  disabled={processing || uploadedFiles.length === 0}
                  className="w-full bg-black text-white rounded-full px-6 py-3 text-sm font-medium hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-150 shadow-sm flex items-center justify-center gap-2"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Extract Text</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Panel: Results (Narrower - 5 cols) */}
          <div className="lg:col-span-5 h-full min-h-[600px]">
            <div className="bg-white border border-neutral-200 rounded-lg h-full flex flex-col shadow-sm overflow-hidden">
              {/* Panel Header */}
              <div className="px-5 py-3 border-b border-neutral-100 flex items-center justify-between bg-white">
                <h2 className="text-sm font-medium text-neutral-900 border-b-2 border-transparent hover:border-neutral-900 transition-colors cursor-default pb-0.5">Extracted Content</h2>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-400 font-mono">
                    {result ? `${result.length} chars` : '0 chars'}
                  </span>
                  <button
                    onClick={() => navigator.clipboard?.writeText(result || '')}
                    disabled={!result}
                    className="text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-900 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Text Area */}
              <div className="flex-1 relative bg-white">
                <textarea
                  readOnly
                  value={result}
                  placeholder="Text will appear here..."
                  className="absolute inset-0 w-full h-full p-6 text-neutral-800 font-serif text-base leading-relaxed resize-none focus:outline-none placeholder:text-neutral-300 placeholder:font-sans placeholder:italic"
                  style={{ fontFamily: 'Newsreader, serif' }}
                />

                {/* PDF Conversion Overlay (Minimal) */}
                {pdfConverting && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center">
                    <div className="w-full max-w-[200px] bg-neutral-100 rounded-full h-1 overflow-hidden mb-4">
                      <div className="h-full bg-black animate-progress"></div>
                    </div>
                    <p className="text-sm font-medium text-neutral-900 animate-pulse">
                      {pdfConversionStatus || 'Converting PDF...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
