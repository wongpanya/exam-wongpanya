import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Download, 
    RefreshCw, 
    Search, 
    Users, 
    CheckCircle, 
    Clock, 
    AlertTriangle, 
    FileSpreadsheet, 
    AlertCircle, 
    Calendar, 
    BookOpen,
    Save
} from 'lucide-react';
import api from '../../config/api';

export default function AttendanceSummary() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    
    const [session, setSession] = useState(null);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all'); // all, present, late, absent
    const [cutoffEditDate, setCutoffEditDate] = useState('');
    const [cutoffEditTime, setCutoffEditTime] = useState('');
    const [savingCutoff, setSavingCutoff] = useState(false);

    // Get Auth Config
    const getConfig = () => {
        const user = JSON.parse(localStorage.getItem('user'));
        return {
            headers: { Authorization: `Bearer ${user.token}` },
        };
    };

    // Fetch session details and students
    const fetchSummaryData = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);

            const { data } = await api.get(`/attendance/${sessionId}`, getConfig());
            setSession(data);
            
            // Set cutoff editor state
            if (data.absentCutoffAt) {
                const d = new Date(data.absentCutoffAt);
                const tzOffset = d.getTimezoneOffset() * 60000;
                const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
                const parts = localISOTime.split('T');
                setCutoffEditDate(parts[0]);
                setCutoffEditTime(parts[1]);
            } else {
                setCutoffEditDate('');
                setCutoffEditTime('');
            }

            // Map class students to their attendance records
            const allStudents = data.category?.students || [];
            const records = data.records || [];
            
            const mappedList = allStudents.map(student => {
                const record = records.find(r => {
                    const recordStudentId = r.student?._id || r.student;
                    return recordStudentId === student._id;
                });
                return {
                    _id: student._id,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    email: student.email,
                    phoneNumber: student.phoneNumber,
                    status: record ? record.status : 'absent', // Default to absent if no record exists
                    checkedInAt: record ? record.checkedInAt : null,
                    remark: record ? record.remark : ''
                };
            });

            setStudents(mappedList);
        } catch (err) {
            console.error('Failed to fetch attendance summary:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [sessionId]);

    useEffect(() => {
        fetchSummaryData();
    }, [fetchSummaryData]);

    // Handle manual status update (optimistic update)
    const handleStatusUpdate = async (studentId, newStatus) => {
        const previousStudents = [...students];
        
        // Optimistic state update
        setStudents(prev => prev.map(s => {
            if (s._id === studentId) {
                return {
                    ...s,
                    status: newStatus,
                    checkedInAt: newStatus === 'absent' ? null : (s.checkedInAt || new Date().toISOString())
                };
            }
            return s;
        }));

        try {
            const student = students.find(s => s._id === studentId);
            await api.post(`/attendance/${sessionId}/manual`, {
                studentId,
                status: newStatus,
                remark: student?.remark || ''
            }, getConfig());
        } catch (err) {
            console.error('Failed to update status manually:', err);
            // Revert state
            setStudents(previousStudents);
            alert('เกิดข้อผิดพลาดในการเปลี่ยนสถานะ กรุณาลองใหม่อีกครั้ง');
        }
    };

    // Handle manual remark update
    const handleRemarkUpdate = async (studentId, newRemark) => {
        const previousStudents = [...students];
        
        setStudents(prev => prev.map(s => {
            if (s._id === studentId) {
                return { ...s, remark: newRemark };
            }
            return s;
        }));

        try {
            const student = students.find(s => s._id === studentId);
            await api.post(`/attendance/${sessionId}/manual`, {
                studentId,
                status: student?.status || 'absent',
                remark: newRemark
            }, getConfig());
        } catch (err) {
            console.error('Failed to update remark:', err);
            setStudents(previousStudents);
        }
    };

    // Update cutoff date & time
    const handleSaveCutoff = async () => {
        try {
            setSavingCutoff(true);
            let formattedCutoff = null;
            if (cutoffEditDate) {
                const timeString = cutoffEditTime || '00:00';
                formattedCutoff = new Date(`${cutoffEditDate}T${timeString}`).toISOString();
            }
            const { data } = await api.post(`/attendance/${sessionId}/status`, {
                absentCutoffAt: formattedCutoff
            }, getConfig());
            setSession(data);
            
            // Re-fetch mapping to ensure correct statuses
            fetchSummaryData();
            alert('บันทึกเวลาหมดเขตเช็คชื่อสำเร็จ');
        } catch (err) {
            console.error('Failed to update cutoff:', err);
            alert('เกิดข้อผิดพลาดในการบันทึกเวลาหมดเขต');
        } finally {
            setSavingCutoff(false);
        }
    };

    // Export CSV with UTF-8 BOM for Thai Excel compatibility
    const handleExportCSV = () => {
        if (!session) return;
        
        const headers = ['ลำดับ', 'รหัสนิสิต', 'ชื่อ', 'นามสกุล', 'อีเมล', 'เบอร์โทร', 'เวลาเช็คชื่อ', 'สถานะ', 'หมายเหตุ'];
        const rows = students.map((s, index) => [
            index + 1,
            s.email ? s.email.split('@')[0] : '',
            s.firstName,
            s.lastName,
            s.email,
            s.phoneNumber || '',
            s.checkedInAt ? new Date(s.checkedInAt).toLocaleString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-',
            s.status === 'present' ? 'มาเรียน' : s.status === 'late' ? 'สาย' : 'ขาดเรียน',
            s.remark || ''
        ]);
        
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        ].join('\n');
        
        // Prepended \uFEFF Byte Order Mark
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${session.name}_สรุปการเช็คชื่อเข้าเรียน.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Calculate statistical metrics
    const totalCount = students.length;
    const presentCount = students.filter(s => s.status === 'present').length;
    const lateCount = students.filter(s => s.status === 'late').length;
    const checkedCount = presentCount + lateCount;
    const absentCount = students.filter(s => s.status === 'absent').length;
    const attendanceRate = totalCount > 0 ? ((checkedCount / totalCount) * 100).toFixed(1) : 0;

    // Filter and search student list
    const filteredStudents = students.filter(s => {
        const studentId = s.email ? s.email.split('@')[0] : '';
        const fullName = `${s.firstName} ${s.lastName}`.toLowerCase();
        const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || 
                              s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              studentId.includes(searchQuery);
        
        if (statusFilter === 'all') return matchesSearch;
        return matchesSearch && s.status === statusFilter;
    });

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="text-sm text-gray-500 font-sans">กำลังโหลดข้อมูลสรุปการเข้าเรียน...</p>
            </div>
        );
    }

    if (!session) {
        return (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-150 p-8 max-w-md mx-auto my-8">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <h3 className="text-base font-bold text-gray-800 font-sans">ไม่พบข้อมูลการเช็คชื่อเข้าเรียน</h3>
                <p className="text-xs text-gray-400 mt-2 font-sans">กรุณาตรวจสอบว่ามีอยู่จริงหรืออาจารย์มีสิทธิ์การเข้าถึงข้อมูลนี้</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition font-sans"
                >
                    ย้อนกลับ
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 py-6 font-sans">
            {/* Top Bar with Navigation & Buttons */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-150 pb-5">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-600 hover:text-gray-900 border border-gray-200"
                        title="ย้อนกลับ"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-100 flex items-center gap-1 font-sans">
                                <BookOpen size={10} /> {session.category?.name || 'รายวิชา'}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-sans ${
                                session.status === 'active' 
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                                {session.status === 'active' ? 'เปิดการเข้าเช็ค' : 'ปิดแล้ว'}
                            </span>
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 mt-1 font-sans">{session.name}</h1>
                        <p className="text-xs text-gray-400 font-sans">ประวัติเช็คชื่อทั้งหมดและการปรับปรุงข้อมูลแบบเรียลไทม์</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto font-sans">
                    <button
                        onClick={() => fetchSummaryData(true)}
                        disabled={refreshing}
                        className="px-3 py-2 bg-gray-50 border border-gray-250 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> รีเฟรช
                    </button>
                    <button
                        onClick={handleExportCSV}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm font-sans"
                    >
                        <FileSpreadsheet size={14} /> ดาวน์โหลด CSV (Excel)
                    </button>
                </div>
            </div>

            {/* Statistical Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-tr from-indigo-50/50 to-indigo-100/30 border border-indigo-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
                    <span className="text-xs font-bold text-indigo-700/80 font-sans flex items-center gap-1">
                        <Users size={14} /> นิสิตทั้งหมด
                    </span>
                    <p className="text-2xl font-black text-indigo-900 tracking-tight mt-2">{totalCount} คน</p>
                </div>
                <div className="bg-gradient-to-tr from-emerald-50/50 to-emerald-100/30 border border-emerald-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
                    <span className="text-xs font-bold text-emerald-700/80 font-sans flex items-center gap-1">
                        <CheckCircle size={14} /> มาเรียน
                    </span>
                    <p className="text-2xl font-black text-emerald-900 tracking-tight mt-2">{presentCount} คน</p>
                </div>
                <div className="bg-gradient-to-tr from-amber-50/50 to-amber-100/30 border border-amber-150 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
                    <span className="text-xs font-bold text-amber-700/80 font-sans flex items-center gap-1">
                        <Clock size={14} /> มาสาย
                    </span>
                    <p className="text-2xl font-black text-amber-900 tracking-tight mt-2">{lateCount} คน</p>
                </div>
                <div className="bg-gradient-to-tr from-red-50/50 to-red-100/30 border border-red-100 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
                    <span className="text-xs font-bold text-red-700/80 font-sans flex items-center gap-1">
                        <AlertTriangle size={14} /> ขาดเรียน
                    </span>
                    <p className="text-2xl font-black text-red-900 tracking-tight mt-2">{absentCount} คน</p>
                </div>
                <div className="col-span-2 md:col-span-1 bg-gradient-to-tr from-slate-50 to-slate-100/50 border border-gray-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between min-h-[90px]">
                    <span className="text-xs font-bold text-gray-500/80 font-sans">อัตราการเข้าเรียน</span>
                    <p className="text-2xl font-black text-gray-800 tracking-tight mt-2">{attendanceRate}%</p>
                </div>
            </div>

            {/* Cutoff Setting Panel */}
            <div className="bg-white rounded-2xl border border-gray-150 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 font-sans">
                <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-gray-800 font-sans flex items-center gap-1.5">
                            <Clock size={15} className="text-indigo-600" /> กำหนดเวลาหมดเขตเช็คชื่อเข้าเรียน
                        </h3>
                        {session.absentCutoffAt ? (
                            <span className="text-xs font-bold text-amber-750 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-sans">
                                เช็คสายหลัง: {new Date(session.absentCutoffAt).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                        ) : (
                            <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-0.5 rounded-full border border-gray-200 font-sans">
                                ยังไม่กำหนด (มาเรียนทั้งหมด)
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-gray-400 font-sans">
                        หากเวลาปัจจุบันเลยเวลาที่กำหนด ระบบจะถือว่านักเรียนที่เช็คชื่อมีสถานะ "สาย" (หากไม่ได้เช็คชื่อเลย จะถือว่า "ขาดเรียน")
                    </p>
                </div>
                <div className="flex flex-col md:flex-row md:items-end gap-3 font-sans w-full md:w-auto">
                    <div className="grid grid-cols-2 gap-2 w-full md:w-[280px]">
                        <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5 font-sans">เลือกวันที่ก่อน</label>
                            <input
                                type="date"
                                value={cutoffEditDate}
                                onChange={(e) => {
                                    setCutoffEditDate(e.target.value);
                                    if (!e.target.value) setCutoffEditTime('');
                                }}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white font-sans"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] text-gray-400 mb-0.5 font-sans">เลือกเวลา</label>
                            <input
                                type="time"
                                value={cutoffEditTime}
                                onChange={(e) => setCutoffEditTime(e.target.value)}
                                disabled={!cutoffEditDate}
                                className="w-full px-3 py-1.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white font-sans disabled:bg-gray-50 disabled:text-gray-400"
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSaveCutoff}
                        disabled={savingCutoff}
                        className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 font-sans disabled:opacity-50 h-[34px] md:self-end"
                    >
                        <Save size={12} /> {savingCutoff ? 'บันทึก...' : 'บันทึกเวลา'}
                    </button>
                </div>
            </div>

            {/* Controls: Search & Filter Tabs */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2 font-sans">
                {/* Search Box */}
                <div className="relative max-w-md w-full font-sans">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ค้นหาด้วย ชื่อ, นามสกุล หรือ รหัสนิสิต..."
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-250 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                </div>

                {/* Filter Tabs */}
                <div className="flex border border-gray-200 rounded-xl p-1 bg-gray-50 self-start font-sans">
                    <button
                        onClick={() => setStatusFilter('all')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            statusFilter === 'all' 
                                ? 'bg-white text-gray-800 shadow-sm border border-gray-150' 
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        ทั้งหมด ({totalCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter('present')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            statusFilter === 'present' 
                                ? 'bg-emerald-600 text-white shadow-sm' 
                                : 'text-gray-500 hover:text-emerald-600'
                        }`}
                    >
                        มาเรียน ({presentCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter('late')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            statusFilter === 'late' 
                                ? 'bg-amber-500 text-white shadow-sm' 
                                : 'text-gray-500 hover:text-amber-500'
                        }`}
                    >
                        สาย ({lateCount})
                    </button>
                    <button
                        onClick={() => setStatusFilter('absent')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                            statusFilter === 'absent' 
                                ? 'bg-red-500 text-white shadow-sm' 
                                : 'text-gray-500 hover:text-red-500'
                        }`}
                    >
                        ขาดเรียน ({absentCount})
                    </button>
                </div>
            </div>

            {/* Students Table */}
            <div className="bg-white rounded-2xl border border-gray-150 overflow-hidden shadow-sm">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-16 text-gray-400 font-sans">
                        <Users className="mx-auto text-gray-300 mb-3" size={40} />
                        <p className="text-sm font-semibold">ไม่พบข้อมูลนิสิตที่ตรงกับเงื่อนไข</p>
                        <p className="text-xs text-gray-300 mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรองสถานะ</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-sans">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-150 text-[11px] font-bold text-gray-500 uppercase font-sans">
                                    <th className="py-3 px-4 w-12 text-center">ลำดับ</th>
                                    <th className="py-3 px-4 w-32">รหัสนิสิต</th>
                                    <th className="py-3 px-4 w-60">ชื่อ-นามสกุล</th>
                                    <th className="py-3 px-4 w-36">เวลาเช็คชื่อ</th>
                                    <th className="py-3 px-4 w-64 text-center">ปรับปรุงสถานะ</th>
                                    <th className="py-3 px-4">หมายเหตุ (กดพิมพ์เพื่ออัปเดตอัตโนมัติ)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {filteredStudents.map((s, index) => {
                                    const studentId = s.email ? s.email.split('@')[0] : '';
                                    const checkedInTime = s.checkedInAt 
                                        ? new Date(s.checkedInAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) 
                                        : '-';

                                    return (
                                        <tr key={s._id} className="hover:bg-gray-50/50 transition">
                                            <td className="py-3 px-4 text-center font-semibold text-gray-400">{index + 1}</td>
                                            <td className="py-3 px-4 font-mono font-bold text-gray-700 text-xs">{studentId}</td>
                                            <td className="py-3 px-4 font-bold text-gray-900">
                                                {s.firstName} {s.lastName}
                                                <p className="text-[10px] text-gray-400 font-normal mt-0.5">{s.email}</p>
                                            </td>
                                            <td className="py-3 px-4 text-xs font-medium text-gray-500 font-mono">
                                                {checkedInTime}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex border border-gray-200 rounded-lg overflow-hidden w-full max-w-[220px] mx-auto text-xs font-bold">
                                                    <button
                                                        onClick={() => handleStatusUpdate(s._id, 'present')}
                                                        className={`flex-1 py-1.5 text-center transition ${
                                                            s.status === 'present'
                                                                ? 'bg-emerald-500 text-white shadow-inner'
                                                                : 'bg-white text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 border-r border-gray-150'
                                                        }`}
                                                    >
                                                        มา
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(s._id, 'late')}
                                                        className={`flex-1 py-1.5 text-center transition ${
                                                            s.status === 'late'
                                                                ? 'bg-amber-500 text-white shadow-inner'
                                                                : 'bg-white text-gray-600 hover:bg-amber-50 hover:text-amber-700 border-r border-gray-150'
                                                        }`}
                                                    >
                                                        สาย
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(s._id, 'absent')}
                                                        className={`flex-1 py-1.5 text-center transition ${
                                                            s.status === 'absent'
                                                                ? 'bg-red-500 text-white shadow-inner'
                                                                : 'bg-white text-gray-600 hover:bg-red-50 hover:text-red-700'
                                                        }`}
                                                    >
                                                        ขาด
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4">
                                                <input
                                                    type="text"
                                                    defaultValue={s.remark}
                                                    onBlur={(e) => {
                                                        const val = e.target.value;
                                                        if (val !== s.remark) {
                                                            handleRemarkUpdate(s._id, val);
                                                        }
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.target.blur();
                                                        }
                                                    }}
                                                    placeholder="เพิ่มบันทึกช่วยจำ..."
                                                    className="w-full bg-transparent px-2.5 py-1 border border-transparent rounded-lg hover:border-gray-250 focus:border-indigo-500 outline-none focus:bg-white text-xs transition"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
