import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
        
        // Auto-reload once if the error is related to failing to load a new chunk (e.g. after deployment)
        const isChunkError = error.name === 'ChunkLoadError' || 
                             error.message.includes('dynamically imported module') || 
                             error.message.includes('Importing a module script failed');
                             
        if (isChunkError) {
            const reloaded = sessionStorage.getItem('chunk_reloaded');
            if (!reloaded) {
                sessionStorage.setItem('chunk_reloaded', 'true');
                window.location.reload();
            }
        }
    }

    render() {
        if (this.state.hasError) {
            // If it's a chunk error, it's about to reload, so we can show a brief loading state
            const isChunkError = this.state.error?.name === 'ChunkLoadError' || 
                                 this.state.error?.message?.includes('dynamically imported module') || 
                                 this.state.error?.message?.includes('Importing a module script failed');
            
            if (isChunkError && !sessionStorage.getItem('chunk_reloaded')) {
                 return (
                     <div className="min-h-screen flex items-center justify-center bg-gray-50">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                     </div>
                 );
            }

            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-md w-full text-center">
                        <AlertTriangle className="mx-auto text-amber-500 mb-4" size={48} />
                        <h1 className="text-xl font-bold text-gray-900 mb-2">เกิดข้อผิดพลาด</h1>
                        <p className="text-gray-500 mb-6">ระบบพบปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition flex items-center gap-2 mx-auto"
                        >
                            <RefreshCw size={18} />
                            โหลดหน้าใหม่
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
