import React from 'react';

interface ModalProps {
  title: string;
  children: React.ReactNode;
  /** When omitted, the modal cannot be dismissed via backdrop/escape (used for the one-time secret reveal). */
  onClose?: () => void;
}

export default function Modal({ title, children, onClose }: ModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">{title}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600"
              aria-label="close"
            >
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
