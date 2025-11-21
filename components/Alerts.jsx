import React from 'react';

export default function Alerts({ error, onDismiss }) {
    if (!error) return null;

    const isRateLimit = error.code === 'rate_limit_exceeded' || error.message?.includes('429');

    return (
        <div
            role="alert"
            className={`rounded-lg p-4 border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-sm ${isRateLimit
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-red-50 border-red-200 text-red-900'
                }`}
        >
            <div className="shrink-0 mt-0.5">
                {isRateLimit ? (
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                ) : (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                )}
            </div>

            <div className="flex-1 text-sm">
                <h3 className="font-medium mb-1 tracking-tight">
                    {isRateLimit ? 'Traffic Limit Reached' : 'Processing Error'}
                </h3>
                <p className="opacity-90 leading-relaxed">
                    {error.message || 'An unexpected error occurred. Please try again.'}
                </p>
                {isRateLimit && (
                    <p className="mt-2 text-xs font-medium opacity-75">
                        Tip: Wait a minute or try processing fewer files at once.
                    </p>
                )}
            </div>

            {onDismiss && (
                <button
                    onClick={onDismiss}
                    className={`p-1.5 rounded-full transition-colors ${isRateLimit
                        ? 'hover:bg-amber-100 text-amber-700'
                        : 'hover:bg-red-100 text-red-700'
                        }`}
                    aria-label="Dismiss alert"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            )}
        </div>
    );
}
