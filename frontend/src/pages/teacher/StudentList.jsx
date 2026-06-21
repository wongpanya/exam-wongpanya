import { useState, useEffect, useCallback } from 'react';
import api from '../../config/api';
import { useNavigate } from 'react-router-dom';
import { Search, Pencil, KeyRound, Trash2, X, Save } from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';
import { useToast } from '../../components/ToastProvider';

const StudentList = () => {
    const navigate = useNavigate();
    const { showConfirm } = useDialog();
    const toast = useToast();
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Edit modal state
    const [editModal, setEditModal] = useState(null); // { student, saving }
    const [editForm, setEditForm] = useState({ title: '', firstName: '', lastName: '', phoneNumber: '', email: '' });

    // Reset password modal state
    const [resetPwModal, setResetPwModal] = useState(null); // { student, saving }
    const [newPassword, setNewPassword] = useState('');

    const fetchStudents = useCallback(async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const config = {
                headers: {
                    Authorization: `Bearer ${storedUser.token}`,
                },
            };
            const { data } = await api.get('/users/students', config);
            setStudents(data);
            setFilteredStudents(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch students');
            if (err.response?.status === 401) {
                localStorage.removeItem('user');
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        fetchStudents();
    }, [navigate, fetchStudents]);

    useEffect(() => {
        const filtered = students.filter((student) => {
            const fullName = `${student.title} ${student.firstName} ${student.lastName}`.toLowerCase();
            const term = searchTerm.toLowerCase();
            return (
                fullName.includes(term) ||
                student.email.toLowerCase().includes(term) ||
                student.phoneNumber.includes(term)
            );
        });
        setFilteredStudents(filtered);
        setCurrentPage(1);
    }, [searchTerm, students]);

    // Edit handlers
    const openEditModal = (student) => {
        setEditForm({
            title: student.title,
            firstName: student.firstName,
            lastName: student.lastName,
            phoneNumber: student.phoneNumber,
            email: student.email,
        });
        setEditModal({ student, saving: false });
    };

    const closeEditModal = () => {
        setEditModal(null);
        setEditForm({ title: '', firstName: '', lastName: '', phoneNumber: '', email: '' });
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editModal) return;

        setEditModal(prev => ({ ...prev, saving: true }));
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            const { data } = await api.put(`/users/${editModal.student._id}`, editForm, {
                headers: { Authorization: `Bearer ${storedUser.token}` },
            });

            // Update the student in the list
            setStudents(prev => prev.map(s => s._id === data._id ? { ...s, ...data } : s));
            toast.success('แก้ไขข้อมูลนักเรียนเรียบร้อยแล้ว');
            closeEditModal();
        } catch (err) {
            toast.error(err.response?.data?.message || 'ไม่สามารถแก้ไขข้อมูลได้');
        } finally {
            if (editModal) setEditModal(prev => prev ? { ...prev, saving: false } : null);
        }
    };

    // Reset password handlers
    const openResetPwModal = (student) => {
        setNewPassword('');
        setResetPwModal({ student, saving: false });
    };

    const closeResetPwModal = () => {
        setResetPwModal(null);
        setNewPassword('');
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!resetPwModal) return;

        if (newPassword.length < 6) {
            toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
            return;
        }

        setResetPwModal(prev => ({ ...prev, saving: true }));
        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            await api.put(`/users/${resetPwModal.student._id}/reset-password`, { newPassword }, {
                headers: { Authorization: `Bearer ${storedUser.token}` },
            });

            toast.success('รีเซ็ตรหัสผ่านเรียบร้อยแล้ว');
            closeResetPwModal();
        } catch (err) {
            toast.error(err.response?.data?.message || 'ไม่สามารถรีเซ็ตรหัสผ่านได้');
        } finally {
            if (resetPwModal) setResetPwModal(prev => prev ? { ...prev, saving: false } : null);
        }
    };

    // Delete handler
    const handleDelete = async (student) => {
        const confirmed = await showConfirm({
            title: 'ลบผู้ใช้',
            message: `คุณแน่ใจหรือไม่ที่จะลบ\n${student.title}${student.firstName} ${student.lastName}\n\nการดำเนินการนี้ไม่สามารถย้อนกลับได้`,
            confirmText: 'ลบ',
            cancelText: 'ยกเลิก',
            variant: 'danger',
        });

        if (!confirmed) return;

        try {
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            await api.delete(`/users/${student._id}`, {
                headers: { Authorization: `Bearer ${storedUser.token}` },
            });

            setStudents(prev => prev.filter(s => s._id !== student._id));
            toast.success('ลบผู้ใช้เรียบร้อยแล้ว');
        } catch (err) {
            toast.error(err.response?.data?.message || 'ไม่สามารถลบผู้ใช้ได้');
        }
    };

    // Pagination logic
    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">นักเรียนทั้งหมด</h1>
                    <p className="text-gray-500 mt-1">รายชื่อนักเรียนที่ลงทะเบียนในระบบ ({students.length} คน)</p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหานักเรียน..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-72"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    #
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ชื่อ-นามสกุล
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    อีเมล
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    เบอร์โทร
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    สถานะ
                                </th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        {searchTerm ? 'ไม่พบนักเรียนที่ค้นหา' : 'ยังไม่มีนักเรียนในระบบ'}
                                    </td>
                                </tr>
                            ) : (
                                currentStudents.map((student, index) => (
                                    <tr key={student._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {startIndex + index + 1}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <span className="text-indigo-600 font-semibold text-sm">
                                                        {student.firstName.charAt(0)}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {student.title} {student.firstName} {student.lastName}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{student.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{student.phoneNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {student.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => openEditModal(student)}
                                                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                    title="แก้ไขข้อมูล"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => openResetPwModal(student)}
                                                    className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                    title="รีเซ็ตรหัสผ่าน"
                                                >
                                                    <KeyRound size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(student)}
                                                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                    title="ลบผู้ใช้"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                {filteredStudents.length > 0 && (
                    <div className="bg-white px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <span>แสดง</span>
                            <select 
                                value={itemsPerPage} 
                                onChange={(e) => {
                                    setItemsPerPage(Number(e.target.value));
                                    setCurrentPage(1);
                                }}
                                className="border border-gray-300 rounded-md py-1 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                            <span>รายการ จากทั้งหมด {filteredStudents.length} รายการ</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                            >
                                ก่อนหน้า
                            </button>
                            <span className="text-sm text-gray-600">
                                หน้า {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 hover:bg-gray-50"
                            >
                                ถัดไป
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">แก้ไขข้อมูลนักเรียน</h3>
                            <button onClick={closeEditModal} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="space-y-4">
                            {/* Title */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                                <select
                                    value={editForm.title}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    required
                                >
                                    <option value="นาย">นาย</option>
                                    <option value="นาง">นาง</option>
                                    <option value="นางสาว">นางสาว</option>
                                </select>
                            </div>

                            {/* First Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                                <input
                                    type="text"
                                    value={editForm.firstName}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            {/* Last Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                                <input
                                    type="text"
                                    value={editForm.lastName}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                                <input
                                    type="text"
                                    value={editForm.phoneNumber}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, phoneNumber: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                                <input
                                    type="email"
                                    value={editForm.email}
                                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    required
                                />
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={editModal.saving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {editModal.saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            กำลังบันทึก...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} />
                                            บันทึก
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reset Password Modal */}
            {resetPwModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">รีเซ็ตรหัสผ่าน</h3>
                            <button onClick={closeResetPwModal} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg transition">
                                <X size={20} />
                            </button>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">
                            กำลังรีเซ็ตรหัสผ่านให้: <strong>{resetPwModal.student.title}{resetPwModal.student.firstName} {resetPwModal.student.lastName}</strong>
                        </p>

                        <form onSubmit={handleResetPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่านใหม่</label>
                                <input
                                    type="text"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="รหัสผ่านอย่างน้อย 6 ตัวอักษร"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                                    required
                                    minLength={6}
                                />
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={closeResetPwModal}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={resetPwModal.saving}
                                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {resetPwModal.saving ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            กำลังดำเนินการ...
                                        </>
                                    ) : (
                                        <>
                                            <KeyRound size={16} />
                                            รีเซ็ตรหัสผ่าน
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentList;