import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import api from '../../config/api';
import { Camera, AlertTriangle, CheckCircle, ArrowLeft, X, Keyboard } from 'lucide-react';

/**
 * Parse QR token from either compact dot format or legacy JSON.
 * Compact: "examId.nonce.exp.sig"
 * Legacy:  '{"examId":"...","nonce":"...","exp":...,"sig":"..."}'
 */
function parseQRData(raw) {
    // Try compact dot format: examId.nonce.exp.sig
    const parts = raw.split('.');
    if (parts.length === 4 && parts[0].length >= 20) {
        return {
            examId: parts[0],
            nonce: parts[1],
            exp: parseInt(parts[2], 10),
            sig: parts[3],
        };
    }

    // Fallback: legacy JSON
    return JSON.parse(raw);
}

const JoinExam = () => {
    const navigate = useNavigate();
    const [scanning, setScanning] = useState(false);
    const [status, setStatus] = useState('idle'); // idle, scanning, joining, success, error
    const [message, setMessage] = useState('');
    const [showManual, setShowManual] = useState(false);
    const [manualToken, setManualToken] = useState('');
    const [manualLoading, setManualLoading] = useState(false);
    const html5QrCodeRef = useRef(null);
    const processingRef = useRef(false);

    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    const joinWithToken = useCallback(async (tokenData, rawToken) => {
        try {
            setStatus('joining');
            setMessage('กำลังเข้าห้องสอบ...');

            const { data } = await api.post(
                `/exam-sessions/${tokenData.examId}/join`,
                { qrToken: rawToken || tokenData }
            );

            setStatus('success');
            setMessage('เข้าห้องสอบสำเร็จ!');

            setTimeout(() => {
                navigate(`/student/exam/${tokenData.examId}`);
            }, 800);
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'ไม่สามารถเข้าห้องสอบได้');
            processingRef.current = false;

            setTimeout(() => {
                processingRef.current = false;
                setStatus('idle');
                setMessage('');
            }, 3000);
        }
    }, [navigate]);

    const startScanner = async () => {
        setStatus('scanning');
        setMessage('');
        setShowManual(false);

        try {
            // Reuse existing instance or create new one
            if (!html5QrCodeRef.current) {
                html5QrCodeRef.current = new Html5Qrcode('qr-reader');
            }
            const html5QrCode = html5QrCodeRef.current;

            await html5QrCode.start(
                // Simple facingMode — most iOS compatible
                { facingMode: 'environment' },
                {
                    fps: 8,
                    qrbox: (w, h) => {
                        const size = Math.floor(Math.min(w, h) * 0.6);
                        const clamped = Math.max(240, Math.min(size, 320));
                        return { width: clamped, height: clamped };
                    },
                    disableFlip: true,
                    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
                },
                async (decodedText) => {
                    if (processingRef.current) return;
                    processingRef.current = true;

                    try {
                        const tokenData = parseQRData(decodedText);

                        if (!tokenData.examId) {
                            setStatus('error');
                            setMessage('QR Code ไม่ถูกต้อง');
                            processingRef.current = false;
                            return;
                        }

                        // Stop and clear scanner before joining
                        try { await html5QrCode.stop(); } catch (e) { /* ignore */ }
                        try { html5QrCode.clear(); } catch (e) { /* ignore */ }
                        html5QrCodeRef.current = null;
                        setScanning(false);

                        // Send raw string to backend (compact format)
                        await joinWithToken(tokenData, decodedText);
                    } catch (err) {
                        if (err.response) {
                            setStatus('error');
                            setMessage(err.response?.data?.message || 'ไม่สามารถเข้าห้องสอบได้');
                        } else {
                            setStatus('error');
                            setMessage('QR Code ไม่ถูกต้อง');
                        }
                        processingRef.current = false;

                        setTimeout(() => {
                            processingRef.current = false;
                            setStatus('scanning');
                            setMessage('');
                        }, 3000);
                    }
                },
                () => { /* QR not detected — ignore */ }
            );

            setScanning(true);
        } catch (err) {
            console.error('Camera error:', err);
            setStatus('error');
            setMessage('ไม่สามารถเปิดกล้องได้ กรุณาอนุญาตการใช้กล้อง');
        }
    };

    const stopScanner = async () => {
        if (html5QrCodeRef.current) {
            try { await html5QrCodeRef.current.stop(); } catch (e) { /* ignore */ }
            try { html5QrCodeRef.current.clear(); } catch (e) { /* ignore */ }
            html5QrCodeRef.current = null;
        }
        processingRef.current = false;
        setScanning(false);
        setStatus('idle');
        setMessage('');
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualToken.trim() || manualLoading) return;

        setManualLoading(true);
        try {
            const raw = manualToken.trim();
            const tokenData = parseQRData(raw);
            if (!tokenData.examId) {
                setMessage('Token ไม่ถูกต้อง');
                setManualLoading(false);
                return;
            }
            await joinWithToken(tokenData, raw);
        } catch (err) {
            setStatus('error');
            setMessage('รูปแบบ Token ไม่ถูกต้อง');
        } finally {
            setManualLoading(false);
        }
    };
 
    useEffect(() => {
        return () => {
            if (html5QrCodeRef.current) {
                try { html5QrCodeRef.current.stop(); } catch (e) { /* ignore1 */ }
                try { html5QrCodeRef.current.clear(); } catch (e) { /* ignore */ }
                html5QrCodeRef.current = null;
            }
        };
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/student')}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">สแกน QR เข้าสอบ</h1>
                    <p className="text-gray-500 text-sm">ส่องกล้องไปที่ QR Code ที่อาจารย์แสดง</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 flex flex-col items-center">
                {/* QR Scanner Area */}
                <div
                    id="qr-reader"
                    className="w-full rounded-lg overflow-hidden bg-black"
                    style={{
                        minHeight: status === 'scanning' ? '360px' : '0',
                        maxWidth: '560px',
                        display: status === 'scanning' ? 'block' : 'none',
                    }}
                />

                {/* Status: Idle */}
                {status === 'idle' && !showManual && (
                    <div className="text-center py-8 w-full">
                        <Camera className="mx-auto text-gray-300 mb-4" size={64} />
                        <p className="text-gray-500 mb-6">กดปุ่มด้านล่างเพื่อเปิดกล้องสแกน QR Code</p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                onClick={startScanner}
                                className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
                            >
                                <Camera size={18} /> เปิดกล้องสแกน
                            </button>
                            <button
                                onClick={() => setShowManual(true)}
                                className="w-full sm:w-auto px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 transition"
                            >
                                <Keyboard size={18} /> ใส่โค้ดเอง
                            </button>
                        </div>
                    </div>
                )}

                {/* Status: Scanning */}
                {status === 'scanning' && (
                    <div className="mt-4 text-center w-full">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-2 mb-3 text-xs text-blue-600 space-y-0.5">
                            <p>📸 เข้าใกล้ QR ประมาณ 20–40 ซม.</p>
                            <p>💡 เพิ่มความสว่างหน้าจอ / ลดแสงสะท้อน</p>
                            <p>📐 ถือตรง ๆ อย่าเอียง</p>
                        </div>
                        <p className="text-sm text-gray-500 animate-pulse mb-3">กำลังค้นหา QR Code...</p>
                        <div className="flex items-center justify-center gap-3">
                            <button
                                onClick={stopScanner}
                                className="text-sm text-red-500 hover:text-red-600 transition flex items-center gap-1"
                            >
                                <X size={14} /> ปิดกล้อง
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                                onClick={() => { stopScanner(); setShowManual(true); }}
                                className="text-sm text-indigo-500 hover:text-indigo-600 transition flex items-center gap-1"
                            >
                                <Keyboard size={14} /> ใส่โค้ดเอง
                            </button>
                        </div>
                    </div>
                )}

                {/* Status: Joining */}
                {status === 'joining' && (
                    <div className="mt-4 text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                        <p className="text-indigo-600 font-medium">{message}</p>
                    </div>
                )}

                {/* Status: Success */}
                {status === 'success' && (
                    <div className="mt-4 text-center py-8">
                        <CheckCircle className="mx-auto text-green-500 mb-3" size={48} />
                        <p className="text-green-600 font-medium text-lg">{message}</p>
                        <p className="text-sm text-gray-400 mt-1">กำลังเข้าสู่ข้อสอบ...</p>
                    </div>
                )}

                {/* Status: Error */}
                {status === 'error' && (
                    <div className="mt-4 text-center py-4">
                        <AlertTriangle className="mx-auto text-red-500 mb-2" size={32} />
                        <p className="text-red-600 font-medium">{message}</p>
                        <p className="text-xs text-gray-400 mt-1">จะลองสแกนใหม่อัตโนมัติ...</p>
                    </div>
                )}

                {/* Manual Token Input */}
                {showManual && status !== 'joining' && status !== 'success' && (
                    <div className="w-full max-w-md mt-4">
                        <form onSubmit={handleManualSubmit} className="space-y-3">
                            <label className="block text-sm font-medium text-gray-700">วาง Token ที่นี่</label>
                            <textarea
                                value={manualToken}
                                onChange={(e) => setManualToken(e.target.value)}
                                placeholder="examId.nonce.exp.sig"
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={manualLoading || !manualToken.trim()}
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50"
                                >
                                    {manualLoading ? 'กำลังเข้า...' : 'เข้าห้องสอบ'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setShowManual(false); setManualToken(''); }}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-sm transition"
                                >
                                    ยกเลิก
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JoinExam;
