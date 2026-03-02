import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

const DialogContext = createContext(null);

export const useDialog = () => useContext(DialogContext);

const VARIANT_CONFIG = {
    danger: {
        icon: XCircle,
        iconClass: 'text-red-500',
        confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
        headerClass: 'text-red-700',
    },
    warning: {
        icon: AlertTriangle,
        iconClass: 'text-amber-500',
        confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',
        headerClass: 'text-amber-700',
    },
    success: {
        icon: CheckCircle,
        iconClass: 'text-green-500',
        confirmClass: 'bg-green-600 hover:bg-green-700 text-white',
        headerClass: 'text-green-700',
    },
    info: {
        icon: Info,
        iconClass: 'text-indigo-500',
        confirmClass: 'bg-indigo-600 hover:bg-indigo-700 text-white',
        headerClass: 'text-indigo-700',
    },
};

const DialogModal = ({ dialog, onClose }) => {
    const { id, type, variant = 'info', title, message, confirmText = 'ตกลง', cancelText = 'ยกเลิก' } = dialog;
    const config = VARIANT_CONFIG[variant] || VARIANT_CONFIG.info;
    const Icon = config.icon;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose(id, false);
            }}
        >
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-150">
                {/* Icon & Title */}
                <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 mt-0.5">
                        <Icon size={28} className={config.iconClass} />
                    </div>
                    <div className="flex-1 min-w-0">
                        {title && (
                            <h3 className={`text-base font-bold mb-1 ${config.headerClass}`}>
                                {title}
                            </h3>
                        )}
                        {message && (
                            <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">
                                {message}
                            </p>
                        )}
                    </div>
                    {type === 'alert' && (
                        <button
                            onClick={() => onClose(id, true)}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-lg transition"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Buttons */}
                <div className="flex gap-2 justify-end">
                    {type === 'confirm' && (
                        <button
                            onClick={() => onClose(id, false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                        >
                            {cancelText}
                        </button>
                    )}
                    <button
                        autoFocus
                        onClick={() => onClose(id, true)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${config.confirmClass}`}
                    >
                        {type === 'confirm' ? confirmText : 'ตกลง'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const DialogProvider = ({ children }) => {
    const [dialogs, setDialogs] = useState([]);

    const closeDialog = useCallback((id, result) => {
        setDialogs(prev => {
            const dialog = prev.find(d => d.id === id);
            if (dialog) dialog.resolve(result);
            return prev.filter(d => d.id !== id);
        });
    }, []);

    /**
     * showAlert({ title, message, variant? })
     * variant: 'info' | 'success' | 'warning' | 'danger'
     */
    const showAlert = useCallback(({ title, message, variant = 'info' } = {}) => {
        return new Promise((resolve) => {
            setDialogs(prev => [...prev, {
                id: Date.now() + Math.random(),
                type: 'alert',
                variant,
                title,
                message,
                resolve,
            }]);
        });
    }, []);

    /**
     * showConfirm({ title, message, confirmText?, cancelText?, variant? })
     * Returns Promise<boolean>
     */
    const showConfirm = useCallback(({ title, message, confirmText = 'ยืนยัน', cancelText = 'ยกเลิก', variant = 'danger' } = {}) => {
        return new Promise((resolve) => {
            setDialogs(prev => [...prev, {
                id: Date.now() + Math.random(),
                type: 'confirm',
                variant,
                title,
                message,
                confirmText,
                cancelText,
                resolve,
            }]);
        });
    }, []);

    const value = useMemo(() => ({ showAlert, showConfirm }), [showAlert, showConfirm]);

    return (
        <DialogContext.Provider value={value}>
            {children}
            {dialogs.map(dialog => (
                <DialogModal key={dialog.id} dialog={dialog} onClose={closeDialog} />
            ))}
        </DialogContext.Provider>
    );
};
