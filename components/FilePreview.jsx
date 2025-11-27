import React from 'react';

export default function FilePreview({ file, onRemove }) {
    return (
        <div className="group relative aspect-[3/4] bg-white border border-neutral-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
            {/* 
              WHY: We handle PDF previews differently than images.
              If a preview image is generated (by our pdfConverter utility), we show it.
              Otherwise, we fall back to a clean icon to avoid broken image links or empty boxes.
            */}
            {file.type === 'pdf' ? (
                file.preview ? (
                    <img
                        src={file.preview}
                        alt={`Preview of ${file.name}`}
                        className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-50 p-4 text-center">
                        <svg className="w-8 h-8 text-neutral-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider">PDF</span>
                    </div>
                )
            ) : (
                <img
                    src={file.preview}
                    alt={file.name}
                    className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                />
            )}

            {/* 
              Overlay with filename and remove button 
              WHY: We use a backdrop-blur overlay to ensure text readability regardless of the image content behind it.
            */}
            <div className="absolute inset-x-0 bottom-0 bg-white/95 backdrop-blur-sm p-3 border-t border-neutral-100 flex items-center justify-between">
                <p className="text-xs text-neutral-600 truncate font-medium flex-1 mr-2" title={file.name}>
                    {file.name}
                </p>
                {onRemove && (
                    <button
                        onClick={() => onRemove(file)}
                        className="text-neutral-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-neutral-100"
                        aria-label={`Remove ${file.name}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* PDF Page Count Badge (if available) */}
            {file.type === 'pdf' && file.pageCount && (
                <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                    {file.pageCount} pages
                </div>
            )}
        </div>
    );
}
