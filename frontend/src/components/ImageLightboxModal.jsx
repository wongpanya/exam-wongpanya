import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

const ImageLightboxModal = ({ isOpen, onClose, imageUrl, alt = 'รูปประกอบข้อสอบ' }) => {
    const [zoomLevel, setZoomLevel] = useState(1);

    useEffect(() => {
        if (isOpen) {
            setZoomLevel(1);
            const handleKeyDown = (e) => {
                if (e.key === 'Escape') {
                    e.stopPropagation();
                    onClose();
                }
            };
            window.addEventListener('keydown', handleKeyDown, true);
            return () => window.removeEventListener('keydown', handleKeyDown, true);
        }
    }, [isOpen, onClose]);

    if (!isOpen || !imageUrl) return null;

    const handleZoomIn = (e) => {
        e.stopPropagation();
        setZoomLevel(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleResetZoom = (e) => {
        e.stopPropagation();
        setZoomLevel(1);
    };

    return (
        <div
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 select-none animate-fadeIn"
            onClick={onClose}
        >
            {/* Top Toolbar */}
            <div
                className="w-full max-w-4xl flex items-center justify-between px-4 py-2 text-white bg-gray-900/80 rounded-t-xl border-b border-gray-700/60"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="text-xs sm:text-sm font-medium text-gray-200 truncate pr-2">
                    {alt}
                </span>

                <div className="flex items-center gap-1 sm:gap-2">
                    <button
                        type="button"
                        onClick={handleZoomOut}
                        disabled={zoomLevel <= 0.5}
                        className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition text-gray-300 hover:text-white"
                        title="ย่อภาพ"
                    >
                        <ZoomOut size={18} />
                    </button>
                    <span className="text-xs text-gray-400 min-w-[42px] text-center font-mono">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                        type="button"
                        onClick={handleZoomIn}
                        disabled={zoomLevel >= 3}
                        className="p-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-40 transition text-gray-300 hover:text-white"
                        title="ขยายภาพ"
                    >
                        <ZoomIn size={18} />
                    </button>
                    <button
                        type="button"
                        onClick={handleResetZoom}
                        className="p-1.5 rounded-lg hover:bg-gray-800 transition text-gray-300 hover:text-white"
                        title="รีเซ็ตขนาดปกติ"
                    >
                        <RotateCcw size={16} />
                    </button>
                    <div className="w-px h-5 bg-gray-700 mx-1" />
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-red-600/80 bg-gray-800/80 text-white transition"
                        title="ปิดหน้าต่าง (Esc)"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Image Viewer Body */}
            <div
                className="w-full max-w-4xl flex-1 max-h-[85vh] bg-gray-950/70 rounded-b-xl overflow-auto flex items-center justify-center p-2 sm:p-4 border border-t-0 border-gray-700/60"
                onClick={(e) => e.stopPropagation()}
            >
                <img
                    src={imageUrl}
                    alt={alt}
                    style={{
                        transform: `scale(${zoomLevel})`,
                        transformOrigin: 'center center',
                        transition: 'transform 0.15s ease-out',
                    }}
                    className="max-h-full max-w-full object-contain rounded-lg shadow-2xl cursor-grab active:cursor-grabbing"
                    draggable={false}
                />
            </div>
        </div>
    );
};

export default ImageLightboxModal;
