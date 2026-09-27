import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#131822] border border-white/[0.1] text-slate-100 rounded-xl shadow-modal backdrop-blur-xl animate-scale-in">
      <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400">
        <CheckCircle2 size={16} />
      </div>
      <p className="text-xs font-medium text-slate-200">{toast.message}</p>
      <button 
        onClick={onClose}
        className="ml-2 text-slate-400 hover:text-white transition-colors p-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}
