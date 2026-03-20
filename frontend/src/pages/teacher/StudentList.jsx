import { useState, useEffect } from 'react';
import api from '../../config/api';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';

const StudentList = () => {
    const navigate = useNavigate();
    const { showConfirm, showAlert } = useDialog();
    const [students, setStudents] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [formData, setFormData] = useState({
        title: 'นาย',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        password: '',
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (!storedUser) {
            navigate('/login');
            return;
        }
        fetchStudents();
    }, [navigate]);

    const fetchStudents = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const { data } = await api.get('/users/students', {
                headers: { Authorization: `Bearer ${user.token}` }
            });
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
    };

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
    }, [searchTerm, students]);

    const handleAddClick = () => {
        setEditingStudent(null);
        setFormData({
            title: 'นาย',
            firstName: '',
            lastName: '',
            phoneNumber: '',
            email: '',
            password: '',
        });
        setIsModalOpen(true);
    };

    const handleEditClick = (student) => {
        setEditingStudent(student);
        setFormData({
            title: student.title,
            firstName: student.firstName,
            lastName: student.lastName,
            phoneNumber: student.phoneNumber,
            email: student.email,
            password: '', // Leave empty unless they want to change it
        });
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (student) => {
        const ok = await showConfirm({
            title: 'ยืนยันการลบนักเรียน',
            message: `คุณแน่ใจหรือไม่ว่าต้องการลบนักเรียน ${student.firstName} ${student.lastName} ออกจากระบบ?`,
            confirmText: 'ลบนักเรียน',
            variant: 'danger',
        });
        if (!ok) return;

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            await api.delete(`/users/students/${student._id}`, {
                headers: { Authorization: `Bearer ${user.token}` }
            });
            showAlert({ title: 'สำเร็จ', message: 'ลบนักเรียนเรียบร้อยแล้ว' });
            fetchStudents();
        } catch (err) {
            showAlert({ title: 'เกิดข้อผิดพลาด', message: err.response?.data?.message || 'ไม่สามารถลบนักเรียนได้', variant: 'danger' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: { Authorization: `Bearer ${user.token}` }
            };

            if (editingStudent) {
                // Remove password if it's empty during edit
                const submitData = { ...formData };
                if (!submitData.password) {
                    delete submitData.password;
                }
                await api.put(`/users/students/${editingStudent._id}`, submitData, config);
                showAlert({ title: 'สำเร็จ', message: 'แก้ไขข้อมูลนักเรียนเรียบร้อยแล้ว' });
            } else {
                await api.post('/users/students', formData, config);
                showAlert({ title: 'สำเร็จ', message: 'เพิ่มนักเรียนเข้าระบบเรียบร้อยแล้ว' });
            }
            setIsModalOpen(false);
            fetchStudents();
        } catch (err) {
            showAlert({ title: 'เกิดข้อผิดพลาด', message: err.response?.data?.message || 'ไม่สามารถบันทึกข้อมูลนักเรียนได้', variant: 'danger' });
        } finally {
            setSubmitting(false);
        }
    };

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

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="ค้นหานักเรียน..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none w-full sm:w-64 text-sm"
                        />
                    </div>
                    <button
                        onClick={handleAddClick}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow flex items-center gap-2 transition text-sm whitespace-nowrap"
                    >
                        <Plus size={18} /> เพิ่มนักเรียน
                    </button>
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
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    จัดการ
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                                        {searchTerm ? 'ไม่พบนักเรียนที่ค้นหา' : 'ยังไม่มีนักเรียนในระบบ'}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student, index) => (
                                    <tr key={student._id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {index + 1}
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
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button 
                                                onClick={() => handleEditClick(student)}
                                                className="text-indigo-600 hover:text-indigo-900 mx-2"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteClick(student)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-black bg-opacity-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full relative">
                        <div className="flex justify-between items-center p-6 border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editingStudent ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มนักเรียนใหม่'}
                            </h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600 transition"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="flex gap-4">
                                <div className="w-1/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">คำนำหน้า</label>
                                    <select
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    >
                                        <option value="นาย">นาย</option>
                                        <option value="นาง">นาง</option>
                                        <option value="นางสาว">นางสาว</option>
                                        <option value="ด.ช.">ด.ช.</option>
                                        <option value="ด.ญ.">ด.ญ.</option>
                                    </select>
                                </div>
                                <div className="w-2/3">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อ</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">นามสกุล</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                <input
                                    type="tel"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">อีเมล</label>
                                <input
                                    type="email"
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    รหัสผ่าน {editingStudent && <span className="text-gray-400 text-xs font-normal">(ปล่อยว่างไว้หากไม่ต้องการเปลี่ยน)</span>}
                                </label>
                                <input
                                    type="password"
                                    required={!editingStudent}
                                    minLength={6}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className={`px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
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
