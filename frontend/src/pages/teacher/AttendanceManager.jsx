import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Plus, Play, Pause, Trash2, Check, X, RefreshCw, Users, Clock, AlertCircle, Download, Search, FileSpreadsheet, ArrowUpDown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../config/api';
import { getSocket } from '../../config/socket';
import { useDialog } from '../../components/DialogProvider';

export default function AttendanceManager({ categoryId, categoryStudents = [] }) {
    const navigate = useNavigate();
    const { showConfirm } = useDialog();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Create session modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSessionName, setNewSessionName] = useState('');
    const [newInterval, setNewInterval] = useState(10);
    const [customInterval, setCustomInterval] = useState('15');
    const [newCutoffDate, setNewCutoffDate] = useState('');
    const [newCutoffTime, setNewCutoffTime] = useState('');
    const [creating, setCreating] = useState(false);

    // Active checking screen states
    const [activeSession, setActiveSession] = useState(null);
    const [qrToken, setQrToken] = useState('');
    const [shortCode, setShortCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(10);
    const [reopenInterval, setReopenInterval] = useState(10);
    const [reopenIntervalType, setReopenIntervalType] = useState('preset');
    const [checkingLogs, setCheckingLogs] = useState([]);
    const [isCheckingActive, setIsCheckingActive] = useState(true);
    const [refreshingLogs, setRefreshingLogs] = useState(false);

    // Overall Summary Matrix states
    const [viewMode, setViewMode] = useState('sessions'); // 'sessions' or 'matrix'
    const [matrixSearch, setMatrixSearch] = useState('');
    const [minAbsencesFilter, setMinAbsencesFilter] = useState(0);
    const [sortBy, setSortBy] = useState('absences'); // 'absences', 'id', 'name'
    const [sortOrder, setSortOrder] = useState('desc');

    const timerRef = useRef(null);

    // Get Auth Config
    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    // Fetch all attendance sessions
    const fetchSessions = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/attendance/category/${categoryId}`, getConfig());
            setSessions(data);
        } catch (err) {
            console.error('Failed to fetch attendance sessions:', err);
        } finally {
            setLoading(false);
        }
    }, [categoryId]);

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    // Create a new session
    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!newSessionName.trim() || creating) return;

        try {
            setCreating(true);
            const parsedCustom = Number(customInterval);
            const finalInterval = newInterval === 'custom'
                ? (isNaN(parsedCustom) || parsedCustom < 5 ? 5 : Math.min(3600, Math.floor(parsedCustom)))
                : Number(newInterval);
            
            let formattedCutoff = null;
            if (newCutoffDate) {
                const timeString = newCutoffTime || '00:00';
                formattedCutoff = new Date(`${newCutoffDate}T${timeString}`).toISOString();
            }

            const { data } = await api.post(
                '/attendance',
                {
                    categoryId,
                    name: newSessionName.trim(),
                    qrRotateInterval: finalInterval,
                    absentCutoffAt: formattedCutoff
                },
                getConfig()
            );
            
            setShowCreateModal(false);
            setNewSessionName('');
            setNewInterval(10);
            setCustomInterval('15');
            setNewCutoffDate('');
            setNewCutoffTime('');
            fetchSessions();
            
            // Auto open the newly created session
            handleOpenChecking(data);
        } catch (err) {
            console.error('Failed to create attendance session:', err);
        } finally {
            setCreating(false);
        }
    };

    // Delete attendance session
    const handleDeleteSession = async (id, name) => {
        const confirmed = await showConfirm(`คุณต้องการลบรายการเช็คชื่อ "${name}" ใช่หรือไม่?`);
        if (!confirmed) return;

        try {
            await api.delete(`/attendance/${id}`, getConfig());
            fetchSessions();
        } catch (err) {
            console.error('Failed to delete attendance session:', err);
        }
    };

    // Force rotate PIN & Token
    const rotateCode = useCallback(async (sessionId) => {
        try {
            const { data } = await api.post(`/attendance/${sessionId}/rotate`, {}, getConfig());
            setQrToken(data.token);
            setShortCode(data.shortCode);
        } catch (err) {
            console.error('Failed to rotate code:', err);
        }
    }, []);

    // Fetch checking logs manually
    const fetchCheckingLogs = useCallback(async (sessionId, shouldRotate = false) => {
        try {
            setRefreshingLogs(true);
            const { data } = await api.get(`/attendance/${sessionId}`, getConfig());
            setCheckingLogs(data.records || []);
            setIsCheckingActive(data.status === 'active');
            if (data.status === 'active' && shouldRotate) {
                rotateCode(sessionId);
            }
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setRefreshingLogs(false);
        }
    }, [rotateCode]);

    // Open active checking screen
    const handleOpenChecking = (session) => {
        setActiveSession(session);
        setCheckingLogs([]); // Clear logs and fetch fresh populated ones
        setIsCheckingActive(session.status === 'active');
        setTimeLeft(session.qrRotateInterval);
        setReopenInterval(session.qrRotateInterval);
        if ([5, 10, 15, 20].includes(session.qrRotateInterval)) {
            setReopenIntervalType('preset');
        } else {
            setReopenIntervalType('custom');
        }
        
        // Fetch fully populated logs and perform initial rotation
        fetchCheckingLogs(session._id, true);

        // Connect socket for real-time check-ins
        const socket = getSocket();
        if (socket) {
            socket.emit('join-session', session._id);
            socket.on('student-checked-in', (record) => {
                setCheckingLogs((prev) => {
                    const studentId = record.student?._id || record.student;
                    if (prev.some((r) => (r.student?._id || r.student) === studentId)) return prev;
                    return [record, ...prev];
                });
            });
        }
    };

    // Handle Active Checking Rotation Interval
    useEffect(() => {
        if (activeSession && isCheckingActive) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        rotateCode(activeSession._id);
                        return activeSession.qrRotateInterval;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [activeSession, isCheckingActive, rotateCode]);

    // Close active checking screen
    const handleCloseChecking = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        
        const socket = getSocket();
        if (socket && activeSession) {
            socket.emit('leave-session', activeSession._id);
            socket.off('student-checked-in');
        }

        setActiveSession(null);
        setQrToken('');
        setShortCode('');
        fetchSessions();
    };

    // Toggle active/closed status
    const handleToggleCheckingStatus = async () => {
        if (!activeSession) return;
        const newStatus = isCheckingActive ? 'closed' : 'active';
        
        try {
            const { data } = await api.post(
                `/attendance/${activeSession._id}/status`,
                { status: newStatus },
                getConfig()
            );
            
            setIsCheckingActive(newStatus === 'active');
            if (newStatus === 'active') {
                setTimeLeft(data.qrRotateInterval);
                rotateCode(activeSession._id);
            } else {
                setShortCode('');
                setQrToken('');
                if (timerRef.current) clearInterval(timerRef.current);
            }
        } catch (err) {
            console.error('Failed to toggle checking status:', err);
        }
    };

    // Update rotation duration for re-opening
    const handleUpdateInterval = async (seconds) => {
        if (!activeSession) return;
        try {
            await api.post(
                `/attendance/${activeSession._id}/status`,
                { status: 'active', qrRotateInterval: seconds },
                getConfig()
            );
            
            activeSession.qrRotateInterval = seconds;
            setIsCheckingActive(true);
            setTimeLeft(seconds);
            rotateCode(activeSession._id);
        } catch (err) {
            console.error('Failed to change interval:', err);
        }
    };

    // Sort and filter matrix logic
    const handleSort = (field) => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(field);
            setSortOrder(field === 'absences' ? 'desc' : 'asc');
        }
    };

    // Calculate chronological sessions
    const chronologicalSessions = [...sessions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // Calculate students data for matrix
    const matrixStudents = categoryStudents.map(student => {
        let presentCount = 0;
        let lateCount = 0;
        let leaveCount = 0;
        let absentCount = 0;

        const studentSessions = chronologicalSessions.map(sess => {
            const record = sess.records?.find(r => (r.student?._id || r.student) === student._id);
            const status = record ? record.status : 'absent';
            if (status === 'present') presentCount++;
            else if (status === 'late') lateCount++;
            else if (status === 'leave') leaveCount++;
            else if (status === 'absent') absentCount++;
            return {
                sessionId: sess._id,
                status,
                checkedInAt: record?.checkedInAt || null,
                remark: record?.remark || ''
            };
        });

        const studentId = student.email ? student.email.split('@')[0] : '';
        const fullName = `${student.firstName} ${student.lastName}`;

        return {
            _id: student._id,
            studentId,
            fullName,
            email: student.email,
            phoneNumber: student.phoneNumber,
            sessions: studentSessions,
            presentCount,
            lateCount,
            leaveCount,
            absentCount
        };
    });

    const filteredMatrixStudents = matrixStudents.filter(s => {
        const matchesSearch = s.fullName.toLowerCase().includes(matrixSearch.toLowerCase()) ||
                              s.studentId.toLowerCase().includes(matrixSearch.toLowerCase()) ||
                              s.email.toLowerCase().includes(matrixSearch.toLowerCase());
        const matchesAbsence = s.absentCount >= minAbsencesFilter;
        return matchesSearch && matchesAbsence;
    });

    const sortedMatrixStudents = [...filteredMatrixStudents].sort((a, b) => {
        if (sortBy === 'absences') {
            return sortOrder === 'desc' ? b.absentCount - a.absentCount : a.absentCount - b.absentCount;
        } else if (sortBy === 'id') {
            return sortOrder === 'desc' ? b.studentId.localeCompare(a.studentId) : a.studentId.localeCompare(b.studentId);
        } else if (sortBy === 'name') {
            return sortOrder === 'desc' ? b.fullName.localeCompare(a.fullName) : a.fullName.localeCompare(b.fullName);
        }
        return 0;
    });

    const handleExportMatrixCSV = () => {
        if (sortedMatrixStudents.length === 0) return;
        
        const sessionHeaders = chronologicalSessions.map(s => s.name);
        const headers = ['ลำดับ', 'รหัสนิสิต', 'ชื่อ-นามสกุล', 'อีเมล', ...sessionHeaders, 'มาเรียน', 'สาย', 'ลาเรียน', 'ขาดเรียน'];
        
        const rows = sortedMatrixStudents.map((s, index) => {
            const sessionStatuses = s.sessions.map(sess => {
                if (sess.status === 'present') return 'มาเรียน';
                if (sess.status === 'late') return 'สาย';
                if (sess.status === 'leave') return 'ลาเรียน';
                return 'ขาดเรียน';
            });
            return [
                index + 1,
                s.studentId,
                s.fullName,
                s.email,
                ...sessionStatuses,
                s.presentCount,
                s.lateCount,
                s.leaveCount,
                s.absentCount
            ];
        });
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `สรุปการเช็คชื่อเข้าเรียน.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Header & Create Button */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900 font-sans">เช็คชื่อเข้าเรียน</h2>
                    <p className="text-xs text-gray-500 font-sans">สร้างรายการเช็คชื่อ เปิดสแกน QR Code หรือป้อนรหัส 6 หลัก</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm flex items-center gap-1.5 transition shadow-sm font-sans"
                >
                    <Plus size={16} /> สร้างรายการเช็คชื่อ
                </button>
            </div>

            {/* View Mode Toggle Tabs */}
            <div className="flex border-b border-gray-250 gap-2 mb-4 font-sans">
                <button
                    onClick={() => setViewMode('sessions')}
                    className={`py-2 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5
                        ${viewMode === 'sessions'
                            ? 'border-indigo-600 text-indigo-600 border-b-2'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <Clock size={15} /> รายการเช็คชื่อรายคาบ
                </button>
                <button
                    onClick={() => setViewMode('matrix')}
                    className={`py-2 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5
                        ${viewMode === 'matrix'
                            ? 'border-indigo-600 text-indigo-600 border-b-2'
                            : 'border-transparent text-gray-400 hover:text-gray-600'
                        }`}
                >
                    <Users size={15} /> ตารางสรุปการเข้าเรียน/ขาดเรียน
                </button>
            </div>

            {/* Attendance Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
            ) : viewMode === 'sessions' ? (
                sessions.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-150 p-12 text-center">
                        <Users className="mx-auto text-gray-300 mb-3" size={48} />
                        <h3 className="text-sm font-bold text-gray-700 font-sans">ยังไม่มีรายการเช็คชื่อเข้าเรียน</h3>
                        <p className="text-xs text-gray-400 mt-1 mb-4 font-sans">เริ่มต้นเช็คชื่อนิสิตเพื่อบันทึกประวัติการเข้าชั้นเรียน</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition font-sans"
                        >
                            สร้างการเช็คชื่อรายการแรก
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sessions.map((sess) => (
                            <div
                                key={sess._id}
                                className="bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-sm rounded-xl p-5 transition flex flex-col justify-between gap-4"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-gray-900 text-base font-sans">{sess.name}</h4>
                                        <span
                                            className={`px-2 py-0.5 rounded text-[10px] font-semibold border font-sans ${
                                                sess.status === 'active'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                            }`}
                                        >
                                            {sess.status === 'active' ? 'กำลังเปิดอยู่' : 'ปิดแล้ว'}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-400 font-sans">
                                        วันที่สร้าง: {new Date(sess.createdAt).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {sess.absentCutoffAt && (
                                        <p className="text-[11px] text-red-500 font-sans flex items-center gap-1">
                                            <Clock size={11} />
                                            หมดเขตเช็คชื่อ: {new Date(sess.absentCutoffAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center justify-between text-xs pt-3 border-t border-gray-50 font-sans font-semibold">
                                    <span className="text-gray-500 font-sans">
                                        เช็คชื่อแล้ว: {sess.records?.filter(r => r.status !== 'absent').length || 0} / {categoryStudents.length} คน
                                    </span>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenChecking(sess)}
                                            className="px-2.5 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-bold transition flex items-center gap-1 font-sans"
                                        >
                                            <QrCode size={14} /> เปิดจอเช็ค
                                        </button>
                                        <button
                                            onClick={() => navigate(`/teacher/attendance/${sess._id}`)}
                                            className="px-2.5 py-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-bold transition flex items-center gap-1 font-sans"
                                        >
                                            <Users size={14} /> ดูสรุป/แก้ไข
                                        </button>
                                        <button
                                            onClick={() => handleDeleteSession(sess._id, sess.name)}
                                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            ) : (
                /* Matrix View */
                <div className="space-y-4">
                    {/* Matrix Filters */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50 p-4 rounded-xl border border-gray-150">
                        <div className="flex flex-1 flex-col sm:flex-row gap-3">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={matrixSearch}
                                    onChange={(e) => setMatrixSearch(e.target.value)}
                                    placeholder="ค้นหาชื่อหรือรหัสนิสิต..."
                                    className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs font-sans animate-none"
                                />
                            </div>
                            {/* Absence Threshold Filter */}
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-semibold font-sans whitespace-nowrap">ขาดเรียนอย่างน้อย:</span>
                                <select
                                    value={minAbsencesFilter}
                                    onChange={(e) => setMinAbsencesFilter(Number(e.target.value))}
                                    className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white font-sans"
                                >
                                    <option value={0}>ทั้งหมด (0+ ครั้ง)</option>
                                    <option value={1}>1 ครั้งขึ้นไป</option>
                                    <option value={2}>2 ครั้งขึ้นไป</option>
                                    <option value={3}>3 ครั้งขึ้นไป</option>
                                    <option value={5}>5 ครั้งขึ้นไป</option>
                                </select>
                            </div>
                        </div>
                        {/* Export CSV Button */}
                        <button
                            onClick={handleExportMatrixCSV}
                            disabled={sortedMatrixStudents.length === 0}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg font-semibold text-xs flex items-center gap-1.5 transition shadow-sm font-sans"
                        >
                            <Download size={14} /> ดาวน์โหลด CSV
                        </button>
                    </div>

                    {/* Table Container */}
                    {sortedMatrixStudents.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-150 p-12 text-center my-4">
                            <Users className="mx-auto text-gray-300 mb-3" size={48} />
                            <h3 className="text-sm font-bold text-gray-700 font-sans">ไม่พบข้อมูลนิสิตหรือประวัติการเช็คชื่อ</h3>
                            <p className="text-xs text-gray-400 mt-1 font-sans">กรุณาตรวจสอบว่ามีนิสิตลงทะเบียนในวิชานี้ หรือลองเปลี่ยนตัวเลือกการกรองข้อมูล</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-gray-150 rounded-xl shadow-sm bg-white">
                            <div className="inline-block min-w-full align-middle">
                                <div className="overflow-hidden border-b border-gray-150 rounded-xl">
                                    <table className="min-w-full divide-y divide-gray-150 text-xs font-sans relative border-collapse">
                                        <thead className="bg-gray-50 font-bold text-gray-700 sticky top-0 z-20">
                                            <tr>
                                                <th scope="col" className="px-3 py-3 text-center border-b border-r border-gray-200 bg-gray-50 sticky left-0 z-30 w-[50px] min-w-[50px] max-w-[50px]">
                                                    ลำดับ
                                                </th>
                                                <th scope="col" onClick={() => handleSort('id')} className="px-4 py-3 text-left border-b border-r border-gray-200 bg-gray-50 sticky left-[50px] z-30 cursor-pointer hover:bg-gray-100 w-[110px] min-w-[110px] max-w-[110px]">
                                                    <div className="flex items-center gap-1">
                                                        รหัสนิสิต
                                                        <ArrowUpDown size={12} className="text-gray-400" />
                                                    </div>
                                                </th>
                                                <th scope="col" onClick={() => handleSort('name')} className="px-4 py-3 text-left border-b border-r border-gray-200 bg-gray-50 sticky left-[160px] z-30 cursor-pointer hover:bg-gray-100 w-[180px] min-w-[180px] max-w-[180px]">
                                                    <div className="flex items-center gap-1">
                                                        ชื่อ-นามสกุล
                                                        <ArrowUpDown size={12} className="text-gray-400" />
                                                    </div>
                                                </th>
                                                {/* Sessions columns */}
                                                {chronologicalSessions.map((sess) => (
                                                    <th key={sess._id} className="px-3 py-3 text-center border-b border-r border-gray-150 min-w-[110px] bg-gray-50 font-sans" title={sess.name}>
                                                        <div className="truncate max-w-[100px] mx-auto text-gray-700 font-semibold">{sess.name}</div>
                                                    </th>
                                                ))}
                                                {/* Stats columns */}
                                                <th scope="col" className="px-3 py-3 text-center border-b border-r border-gray-150 bg-green-50/50 min-w-[60px] text-emerald-800">มา</th>
                                                <th scope="col" className="px-3 py-3 text-center border-b border-r border-gray-150 bg-amber-50/50 min-w-[60px] text-amber-800">สาย</th>
                                                <th scope="col" className="px-3 py-3 text-center border-b border-r border-gray-150 bg-blue-50/50 min-w-[60px] text-blue-800">ลา</th>
                                                <th scope="col" onClick={() => handleSort('absences')} className="px-3 py-3 text-center border-b border-gray-200 bg-red-50/50 cursor-pointer hover:bg-red-100 min-w-[80px] text-red-800">
                                                    <div className="flex items-center justify-center gap-1">
                                                        ขาด
                                                        <ArrowUpDown size={12} className="text-red-400" />
                                                    </div>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-150">
                                            {sortedMatrixStudents.map((s, idx) => (
                                                <tr key={s._id} className="hover:bg-gray-50/70">
                                                    <td className="px-3 py-3 text-center border-r border-gray-200 bg-white sticky left-0 z-10 font-medium text-gray-500 w-[50px] min-w-[50px] max-w-[50px]">
                                                        {idx + 1}
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-gray-200 bg-white sticky left-[50px] z-10 font-mono text-gray-600 font-medium w-[110px] min-w-[110px] max-w-[110px] truncate">
                                                        {s.studentId || '-'}
                                                    </td>
                                                    <td className="px-4 py-3 border-r border-gray-200 bg-white sticky left-[160px] z-10 font-semibold text-gray-800 w-[180px] min-w-[180px] max-w-[180px] truncate" title={s.fullName}>
                                                        {s.fullName}
                                                    </td>
                                                    {/* Sessions statuses */}
                                                    {s.sessions.map((sess) => {
                                                        let badgeClass = '';
                                                        let label = '';
                                                        if (sess.status === 'present') {
                                                            badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                                            label = 'มา';
                                                        } else if (sess.status === 'late') {
                                                            badgeClass = 'bg-amber-50 text-amber-600 border-amber-200';
                                                            label = 'สาย';
                                                        } else if (sess.status === 'leave') {
                                                            badgeClass = 'bg-blue-50 text-blue-700 border-blue-100';
                                                            label = 'ลา';
                                                        } else {
                                                            badgeClass = 'bg-red-50 text-red-600 border-red-200';
                                                            label = 'ขาด';
                                                        }
                                                        return (
                                                            <td key={sess.sessionId} className="px-3 py-3 text-center border-r border-gray-150">
                                                                <span className={`inline-flex px-2.5 py-0.5 rounded text-[10px] font-bold border ${badgeClass}`} title={sess.remark || undefined}>
                                                                    {label}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                    {/* Stats counts */}
                                                    <td className="px-3 py-3 text-center border-r border-gray-150 bg-green-50/10 font-bold text-emerald-700">{s.presentCount}</td>
                                                    <td className="px-3 py-3 text-center border-r border-gray-150 bg-amber-50/10 font-bold text-amber-600">{s.lateCount}</td>
                                                    <td className="px-3 py-3 text-center border-r border-gray-150 bg-blue-50/10 font-bold text-blue-700">{s.leaveCount}</td>
                                                    <td className="px-3 py-3 text-center border-gray-200 bg-red-50/10 font-bold text-red-600">{s.absentCount}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* 1. Create Session Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <form onSubmit={handleCreateSession} className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4 shadow-xl border border-gray-150">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 font-sans">สร้างรายการเช็คชื่อใหม่</h3>
                            <p className="text-xs text-gray-400 font-sans">ระบุชื่อรายการและเวลาที่ต้องการให้หมุนรหัส</p>
                        </div>
                        <div className="space-y-3 font-sans">
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">ชื่อรายการ (เช่น คาบเรียนที่ 1, สัปดาห์ที่ 2)</label>
                                <input
                                    type="text"
                                    required
                                    value={newSessionName}
                                    onChange={(e) => setNewSessionName(e.target.value)}
                                    placeholder="คาบเรียนที่ 1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-sans"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1 font-sans">ความถี่ในการหมุนเปลี่ยนรหัส QR (วินาที)</label>
                                <select
                                    value={newInterval}
                                    onChange={(e) => setNewInterval(e.target.value === 'custom' ? 'custom' : Number(e.target.value))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-sans"
                                >
                                    <option value={5}>5 วินาที</option>
                                    <option value={10}>10 วินาที (แนะนำ)</option>
                                    <option value={15}>15 วินาที</option>
                                    <option value={20}>20 วินาที</option>
                                    <option value="custom">กำหนดเอง...</option>
                                </select>
                            </div>
                            {newInterval === 'custom' && (
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 mb-1 font-sans">ระบุจำนวนวินาทีที่ต้องการ (ขั้นต่ำ 5 วินาที)</label>
                                    <input
                                        type="number"
                                        min={5}
                                        max={3600}
                                        value={customInterval}
                                        onChange={(e) => setCustomInterval(e.target.value)}
                                        onBlur={() => {
                                            const val = Number(customInterval);
                                            if (!customInterval || isNaN(val) || val < 5) {
                                                setCustomInterval(5);
                                            } else if (val > 3600) {
                                                setCustomInterval(3600);
                                            } else {
                                                setCustomInterval(Math.floor(val));
                                            }
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-sans"
                                        required
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1 font-sans">กำหนดเวลาสาย (หากเลยเวลา ที่กำหนด จะเช็คสาย)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-0.5 font-sans">เลือกวันที่ก่อน</label>
                                        <input
                                            type="date"
                                            value={newCutoffDate}
                                            onChange={(e) => {
                                                setNewCutoffDate(e.target.value);
                                                if (!e.target.value) setNewCutoffTime('');
                                            }}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-sans"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] text-gray-400 mb-0.5 font-sans">เลือกเวลา</label>
                                        <input
                                            type="time"
                                            value={newCutoffTime}
                                            onChange={(e) => setNewCutoffTime(e.target.value)}
                                            disabled={!newCutoffDate}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white font-sans disabled:bg-gray-50 disabled:text-gray-400"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 pt-2 font-sans">
                            <button
                                type="submit"
                                disabled={creating}
                                className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-sm transition disabled:opacity-50 font-sans"
                            >
                                {creating ? 'กำลังบันทึก...' : 'ตกลง'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { 
                                    setShowCreateModal(false); 
                                    setNewSessionName(''); 
                                    setNewCutoffDate('');
                                    setNewCutoffTime('');
                                }}
                                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition font-sans"
                            >
                                ยกเลิก
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* 2. Active Checking Modal (Rotating QR & Sockets) */}
            {activeSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-gray-200 overflow-hidden flex flex-col md:flex-row min-h-[500px] relative">
                        <button
                            onClick={handleCloseChecking}
                            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition z-20"
                            title="ปิดหน้าจอ"
                        >
                            <X size={20} />
                        </button>
                        
                        {/* Display side (QR Code & Control) */}
                        <div className="flex-1 p-6 md:p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 bg-gray-50/50 space-y-6">
                            <div className="text-center space-y-1">
                                <h3 className="text-xl font-bold text-gray-900 font-sans">{activeSession.name}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${isCheckingActive ? 'bg-green-500 animate-ping' : 'bg-red-400'}`} />
                                    <p className={`text-xs font-semibold font-sans ${isCheckingActive ? 'text-green-600' : 'text-red-500'}`}>
                                        {isCheckingActive ? 'เปิดเช็คชื่ออยู่' : 'ปิดการเช็คชื่อชั่วคราว'}
                                    </p>
                                </div>
                            </div>

                            {/* Rotating Code & QR */}
                            {isCheckingActive ? (
                                <>
                                    <div className="bg-white p-6 rounded-3xl shadow-md border border-gray-100">
                                        <QRCodeSVG
                                            value={`${window.location.origin}/student/join?code=${qrToken}`}
                                            size={220}
                                            level="Q"
                                        />
                                    </div>
                                    <div className="text-center space-y-1 font-sans">
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider font-sans">รหัสเข้าเรียนหมุนเวียน</p>
                                        <p className="font-mono text-4xl font-black text-indigo-600 tracking-widest bg-indigo-50 px-5 py-2.5 rounded-2xl animate-pulse">
                                            {shortCode ? `${shortCode.slice(0, 3)} ${shortCode.slice(3)}` : '--- ---'}
                                        </p>
                                    </div>
                                    {/* Timer */}
                                    <div className="w-full max-w-xs space-y-1.5 font-sans">
                                        <div className="flex justify-between text-xs text-gray-400 font-sans">
                                            <span>สลับรหัสถัดไป</span>
                                            <span className="font-bold font-mono text-indigo-600">{timeLeft} วินาที</span>
                                        </div>
                                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-indigo-600 h-2 transition-all duration-1000"
                                                style={{ width: `${(timeLeft / activeSession.qrRotateInterval) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="bg-white rounded-3xl p-8 border border-gray-150 shadow-sm text-center max-w-sm space-y-4 my-8">
                                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
                                        <Pause size={32} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm font-sans">การเช็คชื่อถูกปิดใช้งานชั่วคราว</h4>
                                        <p className="text-xs text-gray-400 mt-1 font-sans">นิสิตจะไม่สามารถใช้ QR หรือ PIN ชุดเดิมในการเช็คชื่อได้</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50 flex flex-col gap-2 font-sans w-full max-w-xs text-left">
                                        <p className="text-[10px] text-gray-400 font-bold uppercase text-center mt-1 font-sans">ระบุเวลาหมุนใหม่เพื่อเปิดอีกครั้ง (วินาที)</p>
                                        <div className="flex flex-col gap-2">
                                            <select
                                                value={reopenIntervalType === 'custom' ? 'custom' : reopenInterval}
                                                onChange={(e) => {
                                                    if (e.target.value === 'custom') {
                                                        setReopenIntervalType('custom');
                                                    } else {
                                                        setReopenIntervalType('preset');
                                                        setReopenInterval(Number(e.target.value));
                                                    }
                                                }}
                                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white font-sans"
                                            >
                                                <option value={5}>5 วินาที</option>
                                                <option value={10}>10 วินาที (แนะนำ)</option>
                                                <option value={15}>15 วินาที</option>
                                                <option value={20}>20 วินาที</option>
                                                <option value="custom">กำหนดเอง...</option>
                                            </select>

                                            {reopenIntervalType === 'custom' && (
                                                <input
                                                    type="number"
                                                    min={5}
                                                    max={3600}
                                                    value={reopenInterval}
                                                    onChange={(e) => setReopenInterval(e.target.value)}
                                                    onBlur={() => {
                                                        const val = Number(reopenInterval);
                                                        if (!reopenInterval || isNaN(val) || val < 5) {
                                                            setReopenInterval(5);
                                                        } else if (val > 3600) {
                                                            setReopenInterval(3600);
                                                        } else {
                                                            setReopenInterval(Math.floor(val));
                                                        }
                                                    }}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-center font-sans"
                                                    required
                                                />
                                            )}

                                            <button
                                                onClick={() => {
                                                    const val = Number(reopenInterval);
                                                    const finalInterval = !reopenInterval || isNaN(val) || val < 5 ? 5 : Math.min(3600, Math.floor(val));
                                                    handleUpdateInterval(finalInterval);
                                                }}
                                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition w-full font-sans"
                                            >
                                                เปิดใช้งานใหม่
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Session control buttons */}
                            <div className="flex gap-2 w-full max-w-md border-t border-gray-100 pt-6 font-sans">
                                <button
                                    onClick={handleToggleCheckingStatus}
                                    className={`flex-1 px-4 py-2.5 rounded-lg font-bold text-xs transition flex items-center justify-center gap-1.5 ${
                                        isCheckingActive
                                            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-250 font-sans'
                                            : 'bg-emerald-600 hover:bg-emerald-700 text-white font-sans'
                                    }`}
                                >
                                    {isCheckingActive ? (
                                        <>
                                            <Pause size={14} /> ปิดชั่วคราว
                                        </>
                                    ) : (
                                        <>
                                            <Play size={14} /> เปิดเช็คชื่อต่อ
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => fetchCheckingLogs(activeSession._id)}
                                    disabled={refreshingLogs}
                                    className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-bold text-xs transition flex items-center gap-1 font-sans"
                                >
                                    <RefreshCw size={14} className={refreshingLogs ? 'animate-spin' : ''} /> รีเฟรช
                                </button>
                                <button
                                    onClick={handleCloseChecking}
                                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs transition font-sans"
                                >
                                    ปิดหน้าจอ
                                </button>
                            </div>
                        </div>

                        {/* Logs list side (Live updating log list) */}
                        <div className="flex-1 p-6 flex flex-col h-[500px] md:h-auto overflow-hidden">
                            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3 font-sans">
                                <div>
                                    <h4 className="font-bold text-gray-900 text-sm font-sans">ผู้เช็คชื่อสำเร็จล่าสุด</h4>
                                    <p className="text-[10px] text-gray-400 font-sans">อัปเดตแบบเรียลไทม์ผ่าน Sockets</p>
                                </div>
                                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold font-sans">
                                    ทั้งหมด {checkingLogs.length} คน
                                </span>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-sans">
                                {checkingLogs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-1">
                                        <AlertCircle size={24} />
                                        <p className="text-xs font-sans">ยังไม่มีผู้เช็คชื่อเข้ามาในขณะนี้</p>
                                        <p className="text-[10px] text-gray-300 font-sans">รอนิสิตแสกน QR Code หรือส่งรหัส...</p>
                                    </div>
                                ) : (
                                    checkingLogs.map((log) => {
                                        const student = log.student;
                                        const studentName = student ? `${student.firstName} ${student.lastName}` : 'ไม่ระบุชื่อ';
                                        const timeStr = log.checkedInAt ? new Date(log.checkedInAt).toLocaleTimeString('th-TH') : '';
                                        const statusLabel = log.status === 'present' ? 'มาเรียน' : log.status === 'late' ? 'สาย' : 'ขาด';
                                        
                                        return (
                                            <div
                                                key={student?._id || log._id}
                                                className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl"
                                            >
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 font-sans">{studentName}</p>
                                                    <p className="text-xs text-gray-400 font-sans">{student?.email || ''}</p>
                                                </div>
                                                <div className="text-right font-sans">
                                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                        log.status === 'present' ? 'bg-green-50 text-green-700 border border-green-200 font-sans' :
                                                        log.status === 'late' ? 'bg-amber-50 text-amber-700 border border-amber-250 font-sans' :
                                                        'bg-red-50 text-red-700 border border-red-200 font-sans'
                                                    }`}>
                                                        {statusLabel}
                                                    </span>
                                                    <p className="text-[10px] text-gray-400 mt-0.5 font-sans">{timeStr}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
