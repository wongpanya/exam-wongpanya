import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => useContext(ToastContext);

const ICONS = {
    success: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-50 border-green-200' },
    error: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 border-red-200' },
    warning: { icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200' },
    info: { icon: Info, color: 'text-indigo-500', bg: 'bg-indigo-50 border-indigo-200' },
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const toast = useCallback(({ message, variant = 'info', duration = 3000 }) => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev.slice(-4), { id, message, variant }]);
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
        return id;
    }, [removeToast]);

    const value = useMemo(() => ({
        toast,
        success: (message) => toast({ message, variant: 'success' }),
        error: (message) => toast({ message, variant: 'error', duration: 5000 }),
        warning: (message) => toast({ message, variant: 'warning' }),
        info: (message) => toast({ message, variant: 'info' }),
    }), [toast]);

    return (
        <ToastContext.Provider value={value}>
            {children}
            {/* Toast Container */}
            <div className="fixed top-4 right-4 z-[300] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
                {toasts.map(t => {
                    const config = ICONS[t.variant] || ICONS.info;
                    const Icon = config.icon;
                    return (
                        <div
                            key={t.id}
                            className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border shadow-lg ${config.bg} animate-in slide-in-from-right duration-200`}
                        >
                            <Icon size={20} className={`${config.color} shrink-0 mt-0.5`} />
                            <p className="text-sm text-gray-800 flex-1">{t.message}</p>
                            <button onClick={() => removeToast(t.id)} className="shrink-0 p-0.5 text-gray-400 hover:text-gray-600">
                                <X size={14} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
};
