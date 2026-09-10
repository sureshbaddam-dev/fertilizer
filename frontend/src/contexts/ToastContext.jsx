import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { playToastSound } from '../utils/soundEffects';

const ToastContext = createContext(null);

// Singleton listener so `toast.success(...)` can be called from non-React code (e.g. axios interceptors)
let toastEmitter = null;

export const toast = {
  success: (message, options = {}) => {
    if (toastEmitter) {
      toastEmitter({ type: 'success', message, ...options });
    }
  },
  error: (message, options = {}) => {
    if (toastEmitter) {
      toastEmitter({ type: 'error', message, ...options });
    }
  },
  warning: (message, options = {}) => {
    if (toastEmitter) {
      toastEmitter({ type: 'warning', message, ...options });
    }
  },
  info: (message, options = {}) => {
    if (toastEmitter) {
      toastEmitter({ type: 'info', message, ...options });
    }
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const recentToastsRef = useRef(new Map());

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(({
    type = 'info',
    message = '',
    description = '',
    duration = 3500,
    sound = true,
  }) => {
    if (!message) return;

    // Deduplication check: prevent identical toast within 1.5 seconds
    const key = `${type}:${message}:${description}`;
    const now = Date.now();
    const lastTime = recentToastsRef.current.get(key) || 0;
    if (now - lastTime < 1500) {
      return;
    }
    recentToastsRef.current.set(key, now);

    // Play subtle audio chime if enabled
    if (sound) {
      playToastSound(type);
    }

    const id = `toast-${now}-${Math.random().toString(36).substr(2, 6)}`;
    const newToast = { id, type, message, description, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Limit max 5 active toasts

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  // Connect singleton emitter
  toastEmitter = showToast;

  return (
    <ToastContext.Provider value={{ showToast, removeToast, toast }}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <ToastContainer toasts={toasts} onDismiss={removeToast} />,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: toast.info,
      toast,
    };
  }
  return context;
}

function ToastContainer({ toasts, onDismiss }) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[99999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-3 sm:px-0"
      aria-live="polite"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}

function ToastItem({ item, onDismiss }) {
  const { type, message, description } = item;

  const styles = {
    success: {
      bg: 'bg-white/95 border-[#A7F3D0]',
      icon: <CheckCircle2 className="w-4 h-4 text-[#00783C] shrink-0 mt-0.5" />,
      accent: 'bg-[#00783C]',
      title: 'text-gray-900',
    },
    error: {
      bg: 'bg-white/95 border-red-200',
      icon: <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
      accent: 'bg-red-500',
      title: 'text-gray-900',
    },
    warning: {
      bg: 'bg-white/95 border-amber-200',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
      accent: 'bg-amber-500',
      title: 'text-gray-900',
    },
    info: {
      bg: 'bg-white/95 border-blue-200',
      icon: <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />,
      accent: 'bg-blue-500',
      title: 'text-gray-900',
    },
  }[type] || {
    bg: 'bg-white/95 border-gray-200',
    icon: <Info className="w-4 h-4 text-gray-600 shrink-0 mt-0.5" />,
    accent: 'bg-gray-500',
    title: 'text-gray-900',
  };

  return (
    <div
      className={`pointer-events-auto rounded-2xl border shadow-xl backdrop-blur-md p-3.5 flex items-start justify-between gap-3 transition-all duration-200 transform animate-in slide-in-from-top-3 fade-in duration-150 font-sans ${styles.bg}`}
      role="alert"
    >
      <div className="flex items-start gap-2.5 min-w-0">
        {styles.icon}
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-bold leading-snug ${styles.title}`}>{message}</p>
          {description && (
            <p className="text-[11px] text-gray-500 font-normal mt-0.5 leading-tight break-words">
              {description}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors shrink-0 cursor-pointer"
        aria-label="Close notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
