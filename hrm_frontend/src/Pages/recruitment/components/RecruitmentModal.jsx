import { createPortal } from "react-dom";
import React, { useEffect } from "react";
import { X } from "lucide-react";

export const modalLabelClass = "block text-sm font-semibold text-slate-700 mb-1.5";

export const modalInputClass =
  "w-full h-11 border border-slate-200 rounded-xl px-3.5 text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-600 disabled:bg-slate-50 disabled:text-slate-500";

export const modalTextareaClass =
  "w-full border border-slate-200 rounded-xl px-3.5 py-3 min-h-[96px] resize-none text-sm text-slate-800 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-600 disabled:bg-slate-50 disabled:text-slate-500";

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
  "2xl": "max-w-5xl",
};

export const ModalButton = ({
  variant = "secondary",
  type = "button",
  children,
  className = "",
  ...props
}) => {
  const variants = {
    secondary: "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
    primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  };

  return (
    <button
      type={type}
      className={`h-10 px-5 rounded-xl text-sm font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-60 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const RecruitmentModal = ({
  open,
  title,
  subtitle,
  badge,
  onClose,
  size = "md",
  tone = "primary",
  footer,
  closeOnBackdrop = false,
  children,
}) => {
  useEffect(() => {
    if (!open) return undefined;

    const handleEscape = (event) => {
      if (event.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  const handleBackdropMouseDown = (event) => {
    if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className={`bg-white rounded-xl border border-slate-200 shadow-2xl w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header
          className={`flex items-center justify-between px-6 py-5 text-white shrink-0 ${
            tone === "danger"
              ? "bg-gradient-to-br from-red-500 to-red-700"
              : "bg-gradient-to-br from-primary-600 to-primary-800"
          }`}
        >
          <div>
            <div className="flex items-center">
              <h2 className="text-lg font-semibold">{title}</h2>
              {badge && (
                <span className="ml-3 bg-white/15 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                  {badge}
                </span>
              )}
            </div>
            {subtitle && <p className="text-sm text-white/80">{subtitle}</p>}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <X size={17} />
          </button>
        </header>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-sm">{children}</div>

        {footer && (
          <footer className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};

export default RecruitmentModal;