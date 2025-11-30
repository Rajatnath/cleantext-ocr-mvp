import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { useRef } from 'react';

export default function ExportOptions({ text }) {
    const pdfContentRef = useRef(null);

    if (!text) return null;

    const handleExportTXT = () => {
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        saveAs(blob, 'ocr-result.txt');
    };

    const handleExportMD = () => {
        const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
        saveAs(blob, 'ocr-result.md');
    };

    const handleExportPDF = async () => {
        // Dynamically import html2pdf to avoid SSR issues
        const html2pdf = (await import('html2pdf.js')).default;

        const element = pdfContentRef.current;
        const opt = {
            margin: [15, 15], // top/bottom, left/right in mm
            filename: 'ocr-result.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        html2pdf().set(opt).from(element).save();
    };

    const handleExportDOCX = () => {
        // Split text by newlines to create paragraphs
        const paragraphs = text.split('\n').map(line =>
            new Paragraph({
                children: [
                    new TextRun({
                        text: line,
                        font: "Calibri",
                        size: 24, // 12pt
                    }),
                ],
            })
        );

        const doc = new Document({
            sections: [{
                properties: {},
                children: paragraphs,
            }],
        });

        Packer.toBlob(doc).then(blob => {
            saveAs(blob, 'ocr-result.docx');
        });
    };

    const handleExportJSON = () => {
        const data = JSON.stringify({
            text: text,
            meta: {
                timestamp: new Date().toISOString(),
                engine: 'Gemini 1.5 Pro'
            }
        }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        saveAs(blob, 'ocr-result.json');
    };

    return (
        <>
            <div className="flex flex-wrap gap-3">
                <span className="text-sm font-medium text-neutral-500 self-center mr-2">Export as:</span>

                <button
                    onClick={handleExportTXT}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors"
                >
                    TXT
                </button>

                <button
                    onClick={handleExportMD}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors"
                >
                    Markdown
                </button>

                <button
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors"
                >
                    JSON
                </button>

                <button
                    onClick={handleExportPDF}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors"
                >
                    PDF
                </button>

                <button
                    onClick={handleExportDOCX}
                    className="px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-md hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 transition-colors"
                >
                    DOCX
                </button>
            </div>

            {/* Hidden container for PDF generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <div
                    ref={pdfContentRef}
                    className="p-10 bg-white text-black font-serif text-base leading-relaxed max-w-[800px]"
                    style={{ fontFamily: 'Georgia, serif', fontSize: '12pt', lineHeight: '1.6' }}
                >
                    {text.split('\n').map((line, i) => {
                        const isTableLine = line.trim().startsWith('|');
                        return (
                            <p
                                key={i}
                                style={{
                                    marginBottom: isTableLine ? '0' : '1em',
                                    pageBreakInside: 'avoid',
                                    fontFamily: isTableLine ? '"Courier New", Courier, monospace' : 'inherit',
                                    whiteSpace: isTableLine ? 'pre' : 'normal',
                                    fontSize: isTableLine ? '10pt' : 'inherit'
                                }}
                            >
                                {line || <br />}
                            </p>
                        );
                    })}
                </div>
            </div>
        </>
    );
}
