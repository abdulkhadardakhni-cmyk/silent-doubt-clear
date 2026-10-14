import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, ExternalLink, QrCode } from 'lucide-react';

export default function QRCodeModal({ isOpen, onClose, classCode, lectureTitle }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const joinUrl = `${window.location.origin}/?code=${encodeURIComponent(classCode)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-center relative transform transition-all scale-100">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
          <QrCode className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-bold text-slate-900">Scan to Join Classroom</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
          Project this code to the class. Students scan with any smartphone camera to ask doubts anonymously.
        </p>

        {/* QR Code Container */}
        <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-sm">
          <QRCodeSVG
            value={joinUrl}
            size={220}
            level="H"
            includeMargin={true}
            imageSettings={{
              src: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234f46e5'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 .88-.36 1.68-.93 2.25z'/></svg>",
              x: undefined,
              y: undefined,
              height: 38,
              width: 38,
              excavate: true,
            }}
          />
        </div>

        {/* Class Code Highlight */}
        <div className="mt-5">
          <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
            Or Enter Class Code
          </div>
          <div className="inline-block bg-indigo-50 border-2 border-indigo-300 px-5 py-2 rounded-xl">
            <span className="font-mono font-black text-2xl tracking-widest text-indigo-700">
              {classCode}
            </span>
          </div>
        </div>

        {lectureTitle && (
          <p className="text-xs text-slate-500 font-medium mt-3 italic">
            "{lectureTitle}"
          </p>
        )}

        {/* Direct Link Copy Button */}
        <div className="mt-6 flex items-center justify-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Direct Student Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
