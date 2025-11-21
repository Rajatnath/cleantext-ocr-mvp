import React from 'react';

export default function StatusBar({ status, progress, processing }) {
    if (!status && !processing) return null;

    return (
        <div className="bg-white border border-neutral-200 rounded-lg p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 shadow-sm">
            <div className="flex items-start gap-3">
                {processing ? (
                    <div className="w-2 h-2 mt-2 rounded-full bg-black animate-pulse shrink-0"></div>
                ) : (
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500 shrink-0"></div>
                )}
                <div className="flex-1 space-y-2">
                    <p className="text-sm font-medium text-neutral-900" role="status" aria-live="polite">
                        {status}
                    </p>
                    {progress > 0 && (
                        <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden">
                            <div
                                className="h-full bg-black rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
