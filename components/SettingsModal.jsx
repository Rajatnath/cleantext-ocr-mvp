import React from 'react';

export default function SettingsModal({ isOpen, onClose, settings, onSettingChange }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <div
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
                aria-hidden="true"
            ></div>

            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="settings-title"
                className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                    <h2 id="settings-title" className="text-sm font-semibold text-neutral-900">Settings</h2>
                    <button
                        onClick={onClose}
                        className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-md hover:bg-neutral-100"
                        aria-label="Close settings"
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Section: Preferences */}
                    <div>
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Preferences</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <label htmlFor="auto-copy" className="text-sm text-neutral-700 font-medium">Auto-copy to clipboard</label>
                                <button
                                    id="auto-copy"
                                    role="switch"
                                    aria-checked={settings.autoCopy}
                                    onClick={() => onSettingChange('autoCopy', !settings.autoCopy)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${settings.autoCopy ? 'bg-black' : 'bg-neutral-200'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${settings.autoCopy ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between">
                                <label htmlFor="show-confidence" className="text-sm text-neutral-700 font-medium">Show confidence scores</label>
                                <button
                                    id="show-confidence"
                                    role="switch"
                                    aria-checked={settings.showConfidence}
                                    onClick={() => onSettingChange('showConfidence', !settings.showConfidence)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 ${settings.showConfidence ? 'bg-black' : 'bg-neutral-200'}`}
                                >
                                    <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition duration-200 ease-in-out ${settings.showConfidence ? 'translate-x-5' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Section: System */}
                    <div>
                        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">System</h3>
                        <div className="bg-neutral-50 rounded-lg p-3 space-y-2 border border-neutral-100">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-neutral-500">Engine Version</span>
                                <span className="font-mono text-neutral-900">v2.4.0-ent</span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-neutral-500">Status</span>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                                    <span className="font-medium text-emerald-700">Operational</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 text-center">
                    <p className="text-[10px] text-neutral-400">
                        OpticalFlow Enterprise &copy; 2025
                    </p>
                </div>
            </div>
        </div>
    );
}
