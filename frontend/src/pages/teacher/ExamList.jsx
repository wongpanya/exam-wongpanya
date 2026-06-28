import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../config/api';
import { 
    Trash2, 
    Eye, 
    PlusCircle, 
    Clock, 
    FileText, 
    Pencil, 
    Folder, 
    FolderOpen, 
    FolderPlus, 
    ArrowLeft, 
    ChevronRight, 
    Plus, 
    X, 
    Move,
    Users,
    QrCode,
    GraduationCap,
    CheckCircle,
    Check,
    Archive,
    RotateCcw
} from 'lucide-react';
import { useDialog } from '../../components/DialogProvider';
import { QRCodeSVG } from 'qrcode.react';
import AttendanceManager from './AttendanceManager';

const ExamList = () => {
    const navigate = useNavigate();
    const { categoryId } = useParams();
    const { showConfirm } = useDialog();
    const [exams, setExams] = useState([]);
    
    // States for custom categories & drag-over tracking
    const [createdCategories, setCreatedCategories] = useState([]);
    const [draggedOverFolder, setDraggedOverFolder] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    
    // Inline category creation
    const [isCreatingCat, setIsCreatingCat] = useState(false);
    const [newCatName, setNewCatName] = useState('');
    const [isEditingCategoryName, setIsEditingCategoryName] = useState(false);
    const [editCategoryNameVal, setEditCategoryNameVal] = useState('');

    // Category student enrollment management states
    const [activeTab, setActiveTab] = useState('exams');
    const [categoryStudents, setCategoryStudents] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [manualSearchQuery, setManualSearchQuery] = useState('');
    const [addingStudent, setAddingStudent] = useState(false);
    const [showQRCodeModal, setShowQRCodeModal] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Find the current category details from categories list
    const currentCategory = createdCategories.find(c => c._id === categoryId);
    const currentFolder = currentCategory ? currentCategory.name : null;

    const fetchExamsAndCategories = useCallback(async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const archivedParam = categoryId ? 'all' : showArchived;
            const [examsRes, categoriesRes] = await Promise.all([
                api.get('/exams', config),
                api.get(`/exams/categories?archived=${archivedParam}`, config)
            ]);

            setExams(examsRes.data);
            const dbCategories = categoriesRes.data;
            setCreatedCategories(dbCategories);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch exams');
        } finally {
            setLoading(false);
        }
    }, [showArchived, categoryId]);

    useEffect(() => {
        fetchExamsAndCategories();
    }, [fetchExamsAndCategories]);

    // Reset activeTab when categoryId changes
    useEffect(() => {
        setActiveTab('exams');
    }, [categoryId]);

    // Fetch students when categoryId or activeTab is students or attendance
    useEffect(() => {
        if (categoryId && (activeTab === 'students' || activeTab === 'attendance')) {
            fetchCategoryStudents();
        }
    }, [categoryId, activeTab]);

    const fetchCategoryStudents = async () => {
        if (!categoryId) return;
        setStudentsLoading(true);
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            const { data } = await api.get(`/exams/categories/${categoryId}/students`, config);
            setCategoryStudents(data);
        } catch (err) {
            console.error('Failed to fetch category students:', err);
            setError('ไม่สามารถดึงข้อมูลรายชื่อนักเรียนได้');
        } finally {
            setStudentsLoading(false);
        }
    };

    const handleAddStudentManual = async (e) => {
        e.preventDefault();
        const query = manualSearchQuery.trim();
        if (!query) return;

        setAddingStudent(true);
        setError('');
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            const { data } = await api.post(
                `/exams/categories/${categoryId}/students`,
                { searchQuery: query },
                config
            );
            
            // Add student locally
            setCategoryStudents(prev => [...prev, data.student]);
            setManualSearchQuery('');
        } catch (err) {
            setError(err.response?.data?.message || 'ไม่สามารถเพิ่มนักเรียนได้');
        } finally {
            setAddingStudent(false);
        }
    };

    const handleRemoveStudent = async (studentId, studentName) => {
        const ok = await showConfirm({
            title: 'ลบนักเรียนออกจากรายวิชา',
            message: `คุณต้องการลบ ${studentName} ออกจากรายวิชานี้ใช่หรือไม่?`,
            confirmText: 'ลบออก',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: { Authorization: `Bearer ${user.token}` },
            };
            await api.delete(`/exams/categories/${categoryId}/students/${studentId}`, config);
            
            // Remove student locally
            setCategoryStudents(prev => prev.filter(s => s._id !== studentId));
        } catch (err) {
            setError(err.response?.data?.message || 'ไม่สามารถลบนักเรียนได้');
        }
    };

    const handleDelete = async (id) => {
        const ok = await showConfirm({ 
            title: 'ลบข้อสอบ', 
            message: 'คุณต้องการลบข้อสอบนี้ใช่หรือไม่?', 
            confirmText: 'ลบ', 
            variant: 'danger' 
        });
        if (!ok) return;

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            await api.delete(`/exams/${id}`, config);
            setExams(exams.filter((exam) => exam._id !== id));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete exam');
        }
    };

    // Category Update API Call
    const updateExamCategory = async (examId, newCategory) => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const { data } = await api.put(`/exams/${examId}`, { category: newCategory }, config);
            
            // Update local state with populated exam from response
            setExams(prev => prev.map(exam => 
                exam._id === examId ? data : exam
            ));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update category');
        }
    };

    // HTML5 Drag and Drop Handlers
    const handleDragStart = (e, examId) => {
        e.dataTransfer.setData('text/plain', examId);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, catId) => {
        e.preventDefault();
        setDraggedOverFolder(catId);
    };

    const handleDragLeave = () => {
        setDraggedOverFolder(null);
    };

    const handleDrop = async (e, catId) => {
        e.preventDefault();
        setDraggedOverFolder(null);
        const examId = e.dataTransfer.getData('text/plain');
        if (!examId) return;
        await updateExamCategory(examId, catId);
    };

    // Create New Category Folder in Database
    const handleCreateCategory = async (e) => {
        e.preventDefault();
        const trimmed = newCatName.trim();
        if (!trimmed) {
            setIsCreatingCat(false);
            return;
        }
        if (trimmed.toLowerCase() === 'ทั่วไป' || createdCategories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
            setError('ชื่อหมวดหมู่นี้มีอยู่แล้ว');
            setNewCatName('');
            setIsCreatingCat(false);
            return;
        }

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const { data } = await api.post('/exams/categories', { name: trimmed }, config);
            setCreatedCategories(prev => [...prev, data]);
            setNewCatName('');
            setIsCreatingCat(false);
            setError('');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create category');
        }
    };

    const startEditingCategoryName = () => {
        if (currentCategory) {
            setEditCategoryNameVal(currentCategory.name);
            setIsEditingCategoryName(true);
        }
    };

    const handleRenameCategory = async (e) => {
        if (e) e.preventDefault();
        const trimmed = editCategoryNameVal.trim();
        if (!trimmed) {
            setIsEditingCategoryName(false);
            return;
        }

        if (trimmed === currentCategory.name) {
            setIsEditingCategoryName(false);
            return;
        }

        if (trimmed.toLowerCase() === 'ทั่วไป' || createdCategories.some(c => c._id !== categoryId && c.name.toLowerCase() === trimmed.toLowerCase())) {
            setError('ชื่อหมวดหมู่นี้มีอยู่แล้ว');
            setIsEditingCategoryName(false);
            return;
        }

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };

            const { data } = await api.put(`/exams/categories/${categoryId}`, { name: trimmed }, config);
            
            // Update local state
            setCreatedCategories(prev => prev.map(c => c._id === categoryId ? data : c));
            setIsEditingCategoryName(false);
            setError('');
        } catch (err) {
            console.error('Failed to rename category:', err);
            setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเปลี่ยนชื่อหมวดหมู่');
        }
    };

    // Delete category folder from database
    const handleDeleteCategory = async (e, catId) => {
        e.stopPropagation();
        const ok = await showConfirm({
            title: 'ลบหมวดหมู่',
            message: 'คุณต้องการลบหมวดหมู่นี้ใช่หรือไม่? (ข้อสอบในหมวดหมู่นี้จะถูกย้ายออกเป็นข้อสอบทั่วไป)',
            confirmText: 'ลบ',
            variant: 'danger'
        });
        if (!ok) return;

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            
            await api.delete(`/exams/categories/${catId}`, config);
            
            // Remove locally
            setCreatedCategories(prev => prev.filter(c => c._id !== catId));
            
            // Reset any exams under this category to null
            setExams(prev => prev.map(exam => 
                exam.category && exam.category._id === catId 
                    ? { ...exam, category: null } 
                    : exam
            ));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete category');
        }
    };

    // Archive category folder
    const handleArchiveCategory = async (e, catId) => {
        e.stopPropagation();
        const ok = await showConfirm({
            title: 'จัดเก็บหมวดหมู่',
            message: 'คุณต้องการจัดเก็บหมวดหมู่นี้ใช่หรือไม่? (ข้อสอบจะยังอยู่ แต่จะมองไม่เห็นในหน้าหลัก)',
            confirmText: 'จัดเก็บ',
            variant: 'warning'
        });
        if (!ok) return;

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            
            await api.put(`/exams/categories/${catId}/archive`, {}, config);
            
            // Remove from list locally
            setCreatedCategories(prev => prev.filter(c => c._id !== catId));
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to archive category');
        }
    };

    // Restore category folder
    const handleRestoreCategory = async (e, catId) => {
        e.stopPropagation();
        const ok = await showConfirm({
            title: 'กู้คืนหมวดหมู่',
            message: 'คุณต้องการกู้คืนหมวดหมู่นี้ใช่หรือไม่? (หมวดหมู่นี้จะถูกนำกลับมาแสดงในหน้าหลัก)',
            confirmText: 'กู้คืน',
            variant: 'primary'
        });
        if (!ok) return;

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const config = {
                headers: {
                    Authorization: `Bearer ${user.token}`,
                },
            };
            
            await api.put(`/exams/categories/${catId}/restore`, {}, config);
            
            // Remove from list locally (since we are in archived list view)
            setCreatedCategories(prev => prev.filter(c => c._id !== catId));
            
            // If we are currently inside this category page, redirect to active view or re-fetch
            if (categoryId === catId) {
                fetchExamsAndCategories();
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to restore category');
        }
    };

    // Move back to general
    const handleMoveToGeneral = async (examId) => {
        const ok = await showConfirm({
            title: 'ย้ายออกไปทั่วไป',
            message: 'คุณต้องการย้ายข้อสอบนี้ออกจากหมวดหมู่เป็นข้อสอบทั่วไปใช่หรือไม่?',
            confirmText: 'ย้ายออก',
            variant: 'warning'
        });
        if (!ok) return;

        await updateExamCategory(examId, 'ทั่วไป');
        // If currently viewing the folder, navigate back to main exams list
        if (categoryId) {
            navigate('/teacher/exams');
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Filter exams based on category ID & search query
    const getFilteredExams = () => {
        return exams.filter((exam) => {
            const matchesSearch = 
                exam.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                exam.examId.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (!categoryId) {
                // Main view shows only general exams (no category or category name is 'ทั่วไป')
                const isGeneral = !exam.category || exam.category.name === 'ทั่วไป';
                return matchesSearch && isGeneral;
            } else {
                // Category detail view shows exams matching categoryId
                const matchesCategory = exam.category && exam.category._id === categoryId;
                return matchesSearch && matchesCategory;
            }
        });
    };

    const filteredExams = getFilteredExams();

    return (
        <div className="space-y-6">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                        {categoryId ? (
                            <>
                                <button 
                                    onClick={() => navigate('/teacher/exams')}
                                    className="p-1 hover:bg-gray-150 rounded-lg text-gray-500 hover:text-indigo-600 transition"
                                    title="ย้อนกลับ"
                                >
                                    <ArrowLeft size={24} />
                                </button>
                                <span 
                                    className="cursor-pointer hover:text-indigo-600 transition"
                                    onClick={() => navigate('/teacher/exams')}
                                >
                                    รายการข้อสอบ
                                </span>
                                <ChevronRight size={20} className="text-gray-400" />
                                {isEditingCategoryName ? (
                                    <form onSubmit={handleRenameCategory} className="inline-flex items-center gap-1.5 font-sans" onClick={(e) => e.stopPropagation()}>
                                        <input
                                            type="text"
                                            autoFocus
                                            value={editCategoryNameVal}
                                            onChange={(e) => setEditCategoryNameVal(e.target.value)}
                                            onBlur={handleRenameCategory}
                                            className="px-2.5 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none bg-white font-sans text-gray-800 font-medium"
                                        />
                                        <button 
                                            type="submit" 
                                            className="p-1 bg-green-50 hover:bg-green-100 text-green-600 rounded transition"
                                            title="บันทึก"
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); setIsEditingCategoryName(false); }}
                                            className="p-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded transition"
                                            title="ยกเลิก"
                                        >
                                            <X size={14} />
                                        </button>
                                    </form>
                                ) : (
                                    <span 
                                        onClick={startEditingCategoryName}
                                        className="text-indigo-600 font-bold hover:text-indigo-800 cursor-pointer flex items-center gap-1.5 group font-sans"
                                        title="คลิกเพื่อแก้ไขชื่อหมวดหมู่"
                                    >
                                        {currentFolder || 'กำลังโหลด...'}
                                        <Pencil size={14} className="text-gray-400 group-hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </span>
                                )}
                            </>
                        ) : (
                            'รายการข้อสอบ'
                        )}
                    </h1>
                    <p className="text-gray-500 mt-1">
                        {categoryId 
                            ? `ข้อสอบในหมวดหมู่ ${currentFolder || ''} (${filteredExams.length} ชุด)`
                            : `จัดการห้องข้อสอบและข้อสอบทั่วไป (${exams.length} ชุด)`
                        }
                    </p>
                </div>
                <button
                    onClick={() => navigate('/teacher/exams/create')}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition text-sm shadow-sm"
                >
                    <PlusCircle size={18} /> สร้างข้อสอบใหม่
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex justify-between items-center">
                    <p className="text-red-600 text-sm">{error}</p>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
                        <X size={16} />
                    </button>
                </div>
            )}

            {categoryId && currentCategory?.isArchived && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-3 text-amber-800 text-sm font-sans mb-4">
                    <div className="flex items-center gap-2">
                        <Archive size={18} className="text-amber-600 shrink-0" />
                        <span>หมวดหมู่นี้ถูกจัดเก็บอยู่ในคลังจัดเก็บ คุณสามารถกู้คืนเพื่อนำกลับมาแสดงในหน้าหลักได้</span>
                    </div>
                    <button
                        onClick={(e) => handleRestoreCategory(e, categoryId)}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition shadow-sm whitespace-nowrap"
                    >
                        กู้คืนหมวดหมู่
                    </button>
                </div>
            )}

            {/* Search filter bar */}
            {exams.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
                    <div className="relative flex-1 w-full">
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อข้อสอบ หรือรหัสข้อสอบ..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                        />
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Folders Section (Only shown on main view) */}
            {!categoryId && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                        <h2 className="text-lg font-bold text-gray-800">
                            {showArchived ? 'คลังจัดเก็บหมวดหมู่ข้อสอบ (ห้อง, รายวิชา)' : 'หมวดหมู่ข้อสอบ (ห้อง, รายวิชา)'}
                        </h2>
                        <button
                            onClick={() => setShowArchived(prev => !prev)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5
                                ${showArchived 
                                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            <Archive size={14} /> {showArchived ? 'ดูหมวดหมู่ทั่วไป' : 'ดูคลังจัดเก็บ'}
                        </button>
                    </div>

                    {showArchived && createdCategories.length === 0 ? (
                        <div className="bg-white rounded-xl border border-gray-150 p-12 text-center">
                            <Archive className="mx-auto text-gray-300 mb-3" size={48} />
                            <h3 className="text-sm font-bold text-gray-700 font-sans">คลังจัดเก็บว่างเปล่า</h3>
                            <p className="text-xs text-gray-400 mt-1 font-sans">คุณไม่มีหมวดหมู่ที่ถูกจัดเก็บในขณะนี้</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {/* Categories List */}
                            {createdCategories.map((cat) => {
                                const count = exams.filter(e => e.category && e.category._id === cat._id).length;
                                const isOver = draggedOverFolder === cat._id;
                                return (
                                    <div
                                        key={cat._id}
                                        onClick={() => navigate(`/teacher/exams/category/${cat._id}`)}
                                        onDragOver={(e) => handleDragOver(e, cat._id)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, cat._id)}
                                        className={`cursor-pointer rounded-xl border p-5 transition-all duration-200 flex flex-col justify-between group h-36 relative select-none
                                            ${isOver 
                                                ? 'border-indigo-500 bg-indigo-50/70 scale-105 shadow-md ring-2 ring-indigo-400/50' 
                                                : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm hover:-translate-y-0.5'
                                            }`}
                                    >
                                        {/* Action icons on hover */}
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition z-10">
                                            {showArchived ? (
                                                <>
                                                    <button
                                                        onClick={(e) => handleRestoreCategory(e, cat._id)}
                                                        className="p-1 text-gray-400 hover:text-indigo-600 hover:bg-gray-100 rounded-md transition"
                                                        title="กู้คืนหมวดหมู่"
                                                    >
                                                        <RotateCcw size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteCategory(e, cat._id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md transition"
                                                        title="ลบหมวดหมู่ถาวร"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={(e) => handleArchiveCategory(e, cat._id)}
                                                        className="p-1 text-gray-400 hover:text-amber-600 hover:bg-gray-100 rounded-md transition"
                                                        title="จัดเก็บหมวดหมู่"
                                                    >
                                                        <Archive size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteCategory(e, cat._id)}
                                                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-md transition"
                                                        title="ลบหมวดหมู่"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>

                                        <div className="flex items-start">
                                            <div className={`p-2 rounded-lg transition-colors
                                                ${isOver 
                                                    ? 'bg-indigo-600 text-white' 
                                                    : 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100'
                                                }`}
                                            >
                                                {isOver ? <FolderOpen size={20} /> : <Folder size={20} />}
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-0.5 min-w-0">
                                            <h3 className="font-semibold text-gray-800 group-hover:text-indigo-600 text-sm truncate pr-4">
                                                {cat.name}
                                            </h3>
                                            <p className="text-[11px] text-gray-400">
                                                {count} ข้อสอบ
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Add category card */}
                            {!showArchived && (
                                <div
                                    className={`rounded-xl border border-dashed border-gray-300 p-5 transition-all duration-200 flex flex-col justify-center items-center h-36 text-center
                                        ${isCreatingCat ? 'bg-white border-indigo-400' : 'bg-gray-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-sm cursor-pointer'}`}
                                    onClick={() => !isCreatingCat && setIsCreatingCat(true)}
                                >
                                    {isCreatingCat ? (
                                        <form onSubmit={handleCreateCategory} className="w-full space-y-2">
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="ชื่อหมวดหมู่..."
                                                value={newCatName}
                                                onChange={(e) => setNewCatName(e.target.value)}
                                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:outline-none text-center bg-white"
                                                onBlur={() => {
                                                    if (!newCatName.trim()) setIsCreatingCat(false);
                                                }}
                                            />
                                            <div className="flex justify-center gap-1">
                                                <button
                                                    type="submit"
                                                    className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] font-semibold hover:bg-indigo-700"
                                                >
                                                    เพิ่ม
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setIsCreatingCat(false);
                                                        setNewCatName('');
                                                    }}
                                                    className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-semibold hover:bg-gray-300"
                                                >
                                                    ยกเลิก
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            <FolderPlus size={20} className="text-gray-400 mb-1" />
                                            <span className="text-xs font-medium text-gray-500">สร้างหมวดหมู่ใหม่</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Tab Navigation (Only in category detail view) */}
            {categoryId && (
                <div className="flex border-b border-gray-200 gap-2 mb-2">
                    <button
                        onClick={() => setActiveTab('exams')}
                        className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
                            ${activeTab === 'exams'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <FileText size={18} />
                        ข้อสอบในหมวดหมู่
                    </button>
                    <button
                        onClick={() => setActiveTab('students')}
                        className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
                            ${activeTab === 'students'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Users size={18} />
                        จัดการนักเรียน ({categoryStudents.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('attendance')}
                        className={`py-2.5 px-5 text-sm font-semibold border-b-2 transition-all flex items-center gap-2
                            ${activeTab === 'attendance'
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <CheckCircle size={18} />
                        เช็คชื่อเข้าเรียน
                    </button>
                </div>
            )}

            {/* 2. Main Content Section (Exams List OR Student List) */}
            {categoryId && activeTab === 'students' ? (
                <div className="space-y-6">
                    {/* PIN & QR Code Section */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">รหัสเข้าร่วมรายวิชา (PIN)</h3>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-3xl font-extrabold text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl tracking-widest uppercase animate-pulse">
                                    {currentCategory?.joinCode 
                                        ? `${currentCategory.joinCode.slice(0, 3)} ${currentCategory.joinCode.slice(3)}` 
                                        : '------'
                                    }
                                </span>
                                <button
                                    onClick={() => setShowQRCodeModal(true)}
                                    className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition flex items-center gap-1.5"
                                >
                                    <QrCode size={16} /> แสดง QR Code
                                </button>
                            </div>
                            <p className="text-xs text-gray-500">
                                ให้นักเรียนสแกน QR Code หรือกรอกรหัส PIN 6 หลักนี้ในหน้า "เข้าร่วมรายวิชา" เพื่อลงทะเบียนเรียน
                            </p>
                        </div>
                    </div>

                    {/* Manual Add Student Form */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <h3 className="text-base font-bold text-gray-900">เพิ่มนักเรียนเข้าชั้นเรียนด้วยตัวเอง</h3>
                        <form onSubmit={handleAddStudentManual} className="flex gap-3 max-w-lg">
                            <input
                                type="text"
                                placeholder="กรอกรหัสนิสิต, อีเมล, หรือชื่อนักเรียน..."
                                value={manualSearchQuery}
                                onChange={(e) => setManualSearchQuery(e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                required
                            />
                            <button
                                type="submit"
                                disabled={addingStudent}
                                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium text-sm transition disabled:opacity-50 flex items-center gap-1"
                            >
                                <Plus size={16} /> {addingStudent ? 'กำลังค้นหา...' : 'เพิ่ม'}
                            </button>
                        </form>
                    </div>

                    {/* Students List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <h3 className="text-base font-bold text-gray-900">นักเรียนในชั้นเรียนทั้งหมด ({categoryStudents.length} คน)</h3>
                        {studentsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        ) : categoryStudents.length === 0 ? (
                            <p className="text-center py-8 text-gray-400 text-sm">ยังไม่มีนักเรียนในรายวิชานี้</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-gray-600">
                                    <thead className="text-xs text-gray-400 uppercase bg-gray-50/70 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold">ชื่อ - นามสกุล</th>
                                            <th className="px-6 py-3 font-semibold">อีเมล (รหัสนิสิต)</th>
                                            <th className="px-6 py-3 font-semibold">เบอร์โทรศัพท์</th>
                                            <th className="px-6 py-3 font-semibold text-right">จัดการ</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {categoryStudents.map((student) => (
                                            <tr key={student._id} className="hover:bg-gray-50/50 transition">
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {student.title}{student.firstName} {student.lastName}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-xs">{student.email}</td>
                                                <td className="px-6 py-4">{student.phoneNumber || '-'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => handleRemoveStudent(student._id, `${student.firstName} ${student.lastName}`)}
                                                        className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition font-medium"
                                                    >
                                                        ลบออก
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* QR Code Modal */}
                    {showQRCodeModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-gray-100 relative text-center">
                                <button
                                    onClick={() => setShowQRCodeModal(false)}
                                    className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 rounded-md transition"
                                >
                                    <X size={20} />
                                </button>
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-gray-950">QR Code เข้าร่วมชั้นเรียน</h3>
                                    <p className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full inline-block font-semibold">
                                        วิชา: {currentFolder}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-2xl inline-block border border-gray-100 mx-auto">
                                    <QRCodeSVG
                                        value={`${window.location.origin}/student/join?code=${currentCategory?.joinCode}`}
                                        size={200}
                                        level="H"
                                    />
                                </div>
                                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 space-y-1">
                                    <p className="text-xs text-gray-500 font-semibold">หรือใช้รหัสเข้าร่วม</p>
                                    <p className="font-mono text-2xl font-black text-indigo-700 tracking-widest uppercase">
                                        {currentCategory?.joinCode 
                                            ? `${currentCategory.joinCode.slice(0, 3)} ${currentCategory.joinCode.slice(3)}` 
                                            : '------'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : categoryId && activeTab === 'attendance' ? (
                <AttendanceManager categoryId={categoryId} categoryStudents={categoryStudents} />
            ) : (
                /* 2. Exams Section */
                <div className="space-y-3">
                    <h2 className="text-lg font-bold text-gray-800">
                        {categoryId 
                            ? `รายการข้อสอบใน ${currentFolder || ''}` 
                            : 'ข้อสอบทั่วไป (ยังไม่มีหมวดหมู่ / ลากไปวางในหมวดหมู่ด้านบนได้)'
                        }
                    </h2>

                    {filteredExams.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                            <FileText className="mx-auto text-gray-300 mb-4" size={48} />
                            <h3 className="text-base font-semibold text-gray-600">
                                {categoryId ? 'หมวดหมู่นี้ยังไม่มีข้อสอบ' : 'ยังไม่มีข้อสอบทั่วไป'}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1">
                                {categoryId 
                                    ? 'ลากข้อสอบทั่วไปใส่โฟลเดอร์นี้เพื่อบันทึกข้อสอบ' 
                                    : 'ข้อสอบทั้งหมดมีหมวดหมู่แล้ว หรือยังไม่มีการสร้างข้อสอบ'
                                }
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {filteredExams.map((exam) => (
                                <div
                                    key={exam._id}
                                    draggable={!categoryId}
                                    onDragStart={(e) => handleDragStart(e, exam._id)}
                                    className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all overflow-hidden relative select-none
                                        ${!categoryId 
                                            ? 'cursor-grab active:cursor-grabbing border-l-4 border-l-indigo-500 hover:border-l-indigo-600' 
                                            : ''
                                        }`}
                                >
                                    <div className="p-5 space-y-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    {!categoryId && (
                                                        <span className="text-gray-400 mr-0.5 flex items-center" title="ลากเพื่อย้ายหมวดหมู่">
                                                            <Move size={12} />
                                                        </span>
                                                    )}
                                                    <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                                                        {exam.examId}
                                                    </span>
                                                    <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-purple-400"></span>
                                                        {exam.category ? exam.category.name : 'ทั่วไป'}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-semibold text-gray-900 mt-1 truncate">
                                                    {exam.title}
                                                </h3>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <FileText size={14} />
                                                <span>{exam.questions.length} ข้อ</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={14} />
                                                <span>{exam.durationMin} นาที</span>
                                            </div>
                                        </div>

                                        <div className="text-xs text-gray-400">
                                            สร้างเมื่อ: {new Date(exam.createdAt).toLocaleDateString('th-TH', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                            })}
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-100 px-5 py-3 bg-gray-50 flex justify-between items-center gap-2">
                                        {/* Show Move back to General only if inside a custom category folder */}
                                        {categoryId ? (
                                            <button
                                                onClick={() => handleMoveToGeneral(exam._id)}
                                                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-lg transition flex items-center gap-1.5 font-medium"
                                                title="ย้ายข้อสอบออกไปยังข้อสอบทั่วไป"
                                            >
                                                <FolderOpen size={14} /> ย้ายออกไปทั่วไป
                                            </button>
                                        ) : (
                                            <span className="text-[11px] text-gray-400 hidden sm:inline flex-shrink-0">
                                                ลากเพื่อย้าย
                                            </span>
                                        )}

                                        <div className="flex gap-1.5 ml-auto">
                                            <button
                                                onClick={() => navigate(`/teacher/exams/${exam._id}`)}
                                                className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition flex items-center gap-1"
                                            >
                                                <Eye size={14} /> ดูรายละเอียด
                                            </button>
                                            <button
                                                onClick={() => navigate(`/teacher/exams/${exam._id}/edit`)}
                                                className="px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg transition flex items-center gap-1"
                                            >
                                                <Pencil size={14} /> แก้ไข
                                            </button>
                                            <button
                                                onClick={() => handleDelete(exam._id)}
                                                className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition flex items-center gap-1"
                                            >
                                                <Trash2 size={14} /> ลบ
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ExamList;
