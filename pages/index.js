import { useRef, useState } from 'react';
import { convertPdfToImages, isPDF, validateFile, getPDFPageOne } from '../utils/pdfConverter';
import FilePreview from '../components/FilePreview';
import StatusBar from '../components/StatusBar';
import Alerts from '../components/Alerts';
import SettingsModal from '../components/SettingsModal';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

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
  const [activeTab, setActiveTab] = useState('text');

  // Settings State
  // WHY: We persist settings in local state (and potentially localStorage in a real app)
  // to allow users to customize their workflow (e.g., auto-copying results).
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({
    autoCopy: false,
    showConfidence: false
  });

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
      // WHY: We process files sequentially rather than in parallel to:
      // 1. Avoid hitting rate limits (429) on the API.
      // 2. Provide a clear, linear progress indicator to the user.
      // 3. Prevent browser freezing when processing large PDFs.
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

      // Auto-copy if enabled
      if (settings.autoCopy) {
        navigator.clipboard?.writeText(combinedResult).catch(err => console.error('Auto-copy failed:', err));
        setStatus('Extraction complete! Copied to clipboard.');
      }

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
        // WHY: We use a structured prompt to guide the AI's output format.
        // Explicit instructions for math ($...$) and tables ensure the output
        // renders correctly in our Markdown viewer (react-markdown + katex).
        prompt: `Transcribe all text from this image exactly as it appears.

For mathematical formulas and equations:
- Use standard LaTeX formatting for all mathematical expressions
- Wrap inline formulas in single dollar signs, e.g., $E = mc^2$
- Wrap block formulas in double dollar signs, e.g., $$ \\frac{d}{dx}f(x) $$
- Use standard operators: \\times for multiplication, \\div for division
- Preserve all mathematical structure and layout

For tables:
- Detect all tabular data and represent it using standard Markdown tables
- Preserve column headers and structure exactly as they appear
- Ensure all data is correctly aligned in the corresponding columns

Return the content as a Markdown document.`,
        forceFallback: false
      })
    });

    if (resp.status === 429) throw new Error('Rate limit exceeded. Please try again in a minute.');

    const json = await resp.json();
    if (!resp.ok) throw new Error(json.error || 'Server error');

    return json.text || 'No text detected';
  }

  return (
    <div className="min-h-screen flex flex-col font-sans text-neutral-900 bg-[#F5F5F5]">
      {/* Loading Overlay */}
      {uploadingFiles && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-neutral-200 border-t-black mb-4"></div>
            <h3 className="text-lg font-medium text-neutral-900">Uploading Files</h3>
            <p className="text-sm text-neutral-500">Please wait...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-16 bg-white border-b border-neutral-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8V6a2 2 0 0 1 2-2h2" />
              <path d="M4 16v2a2 2 0 0 0 2 2h2" />
              <path d="M16 4h2a2 2 0 0 1 2 2v2" />
              <path d="M16 20h2a2 2 0 0 0 2-2v-2" />
              <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
            </svg>
          </div>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold leading-none tracking-tight text-neutral-900">OpticalFlow</h1>
            <p className="text-[10px] text-neutral-400 font-medium tracking-wider mt-0.5 uppercase">Enterprise Engine v2.4</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-md border border-neutral-100">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-medium text-neutral-600">System Operational</span>
          </div>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-full hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-200"
            aria-label="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1Z" />
            </svg>
          </button>
        </div>
      </header >

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSettingChange={(key, value) => setSettings(prev => ({ ...prev, [key]: value }))}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8">
        {uploadedFiles.length === 0 ? (
          // Empty State - Import Document
          <div className="flex-1 flex flex-col items-center justify-center min-h-[600px]">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-medium text-neutral-900 mb-3 tracking-tight">Import Document</h2>
              <p className="text-neutral-500 text-lg">Drag & drop, upload, or paste to begin digitization.</p>
            </div>

            <div className="w-full max-w-2xl">
              <label htmlFor="file" className="block group cursor-pointer">
                <div className="bg-white border-2 border-dashed border-neutral-200 rounded-3xl p-16 flex flex-col items-center justify-center transition-all duration-300 hover:border-neutral-300 hover:shadow-lg hover:shadow-neutral-100 hover:-translate-y-1">
                  <div className="w-20 h-20 bg-neutral-50 rounded-2xl flex items-center justify-center mb-8 text-neutral-400 group-hover:scale-110 group-hover:text-neutral-600 transition-all duration-300">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <span className="text-xl font-medium text-neutral-900 mb-3">Click to browse or drop file</span>
                  <span className="text-sm text-neutral-400 font-mono tracking-wide">JPG, PNG, TIFF (MAX 25MB)</span>
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
              <div className="mt-6">
                <Alerts error={error} onDismiss={() => setError(null)} />
              </div>
            </div>
          </div>
        ) : (
          // Workspace State
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-8rem)] min-h-[600px]">

            {/* Left Panel: Source Material */}
            <div className="bg-[#0A0A0A] rounded-xl overflow-hidden flex flex-col relative shadow-2xl ring-1 ring-black/5">
              {/* Dark Header */}
              <div className="h-14 border-b border-white/10 flex items-center justify-between px-6 bg-[#0A0A0A] shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]"></div>
                  <span className="text-xs font-bold text-neutral-400 tracking-[0.15em] uppercase">Source Material</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 bg-white/5 rounded-md px-2 py-1">
                    <button className="text-neutral-500 hover:text-white transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                    <span className="text-[10px] font-mono text-neutral-400">100%</span>
                    <button className="text-neutral-500 hover:text-white transition-colors">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>
                    </button>
                  </div>
                  <div className="h-4 w-px bg-white/10"></div>
                  <button onClick={clearFiles} className="text-xs font-medium text-neutral-400 hover:text-white transition-colors">Close</button>
                </div>
              </div>

              {/* Image Viewer */}
              <div className="flex-1 relative flex items-center justify-center bg-[#050505] p-8 overflow-hidden group">
                {/* Grid Background */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

                {filePreviews[currentFileIndex] && (
                  <div className="relative z-10 max-w-full max-h-full shadow-2xl transition-transform duration-300">
                    {filePreviews[currentFileIndex].type === 'pdf' ? (
                      <img src={filePreviews[currentFileIndex].preview} alt="Preview" className="max-w-full max-h-full object-contain rounded-sm" />
                    ) : (
                      <img src={filePreviews[currentFileIndex].preview} alt="Preview" className="max-w-full max-h-full object-contain rounded-sm" />
                    )}
                  </div>
                )}

                {/* Floating Action Button - Only show if not processing and no result yet */}
                {!processing && !result && (
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
                    <button
                      onClick={processAllFiles}
                      className="bg-white text-black pl-5 pr-6 py-3.5 rounded-full font-semibold shadow-[0_20px_40px_-12px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3 group/btn"
                    >
                      <svg className="w-5 h-5 transition-transform group-hover/btn:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                      </svg>
                      <span>Initialize OCR Engine</span>
                    </button>
                    <div className="text-center mt-3">
                      <span className="inline-block bg-black/50 backdrop-blur-md text-[10px] text-neutral-400 px-2 py-1 rounded border border-white/10">Press ⌘ + Enter to start</span>
                    </div>
                  </div>
                )}

                {/* Processing State Overlay */}
                {processing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-white/10 border-t-white rounded-full animate-spin mb-6"></div>
                    <h3 className="text-xl font-medium text-white mb-2">{status || 'Processing...'}</h3>
                    <div className="w-64 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel: Output */}
            <div className="bg-white rounded-xl border border-neutral-200 shadow-sm flex flex-col overflow-hidden h-full">
              {/* Panel Header */}
              <div className="h-14 border-b border-neutral-100 flex items-center justify-between px-4 shrink-0">
                <div className="flex bg-neutral-100/80 p-1 rounded-lg">
                  <button
                    onClick={() => setActiveTab('text')}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-2 ${activeTab === 'text' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
                    Plain Text
                  </button>
                  <button
                    onClick={() => setActiveTab('json')}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 flex items-center gap-2 ${activeTab === 'json' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500 hover:text-neutral-700'}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>
                    JSON Data
                  </button>
                </div>

                {result && (
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-400 font-mono">{result.length} chars</span>
                    <button
                      onClick={() => navigator.clipboard?.writeText(result || '')}
                      className="text-xs font-medium bg-neutral-50 hover:bg-neutral-100 text-neutral-900 px-3 py-1.5 rounded-full transition-colors border border-neutral-200"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 relative bg-white overflow-auto">
                {result ? (
                  activeTab === 'text' ? (
                    <div className="absolute inset-0 w-full h-full p-8 text-neutral-800 font-serif text-base leading-relaxed overflow-y-auto prose prose-neutral max-w-none prose-headings:font-sans prose-headings:font-bold prose-p:leading-loose">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath, remarkGfm]}
                        rehypePlugins={[rehypeKatex]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-4" {...props} />,
                          table: ({ node, ...props }) => (
                            <div className="overflow-x-auto my-6 rounded-lg border border-neutral-200 shadow-sm">
                              <table className="min-w-full divide-y divide-neutral-200 text-sm" {...props} />
                            </div>
                          ),
                          thead: ({ node, ...props }) => <thead className="bg-neutral-50" {...props} />,
                          th: ({ node, ...props }) => <th className="px-4 py-3 text-left font-semibold text-neutral-900 border-b border-neutral-200" {...props} />,
                          td: ({ node, ...props }) => <td className="px-4 py-3 text-neutral-700 border-b border-neutral-100" {...props} />,
                        }}
                      >
                        {result}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="absolute inset-0 w-full h-full p-6 overflow-auto bg-neutral-50">
                      <pre className="text-xs font-mono text-neutral-700 whitespace-pre-wrap">
                        {JSON.stringify({ text: result, meta: { timestamp: new Date().toISOString(), engine: 'Gemini 1.5 Pro' } }, null, 2)}
                      </pre>
                    </div>
                  )
                ) : error ? (
                  <div className="p-6">
                    <Alerts error={error} onDismiss={() => setError(null)} />
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-300">
                    <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-300">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <line x1="10" y1="9" x2="8" y2="9" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium">Waiting for input...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div >
  );
}
