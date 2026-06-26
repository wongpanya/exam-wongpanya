import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { DialogProvider } from './components/DialogProvider';
import { ToastProvider } from './components/ToastProvider';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load all pages
const Register = lazy(() => import('./pages/Register'));
const Login = lazy(() => import('./pages/Login'));
const Home = lazy(() => import('./pages/Home'));
const NotFound = lazy(() => import('./pages/NotFound'));
const TeacherLayout = lazy(() => import('./components/TeacherLayout'));
const TeacherHome = lazy(() => import('./pages/teacher/TeacherHome'));
const StudentList = lazy(() => import('./pages/teacher/StudentList'));
const ExamList = lazy(() => import('./pages/teacher/ExamList'));
const CreateExam = lazy(() => import('./pages/teacher/CreateExam'));
const ExamDetail = lazy(() => import('./pages/teacher/ExamDetail'));
const EditExam = lazy(() => import('./pages/teacher/EditExam'));
const ExamSession = lazy(() => import('./pages/teacher/ExamSession'));
const CheatMonitor = lazy(() => import('./pages/teacher/CheatMonitor'));
const ExamHistory = lazy(() => import('./pages/teacher/ExamHistory'));
const ExamAttempts = lazy(() => import('./pages/teacher/ExamAttempts'));
const StudentLayout = lazy(() => import('./components/StudentLayout'));
const StudentHome = lazy(() => import('./pages/student/StudentHome'));
const StudentHistory = lazy(() => import('./pages/student/StudentHistory'));
const JoinExam = lazy(() => import('./pages/student/JoinExam'));
const TakeExam = lazy(() => import('./pages/student/TakeExam'));

const PageLoader = () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">กำลังโหลด...</p>
        </div>
    </div>
);

function App() {
    return (
        <ErrorBoundary>
            <DialogProvider>
                <ToastProvider>
                    <Router>
                        <div className="App">
                            <Suspense fallback={<PageLoader />}>
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/register" element={<Register />} />
                                    <Route path="/login" element={<Login />} />

                                    <Route path="/teacher" element={<TeacherLayout />}>
                                        <Route index element={<TeacherHome />} />
                                        <Route path="students" element={<StudentList />} />
                                        <Route path="exams" element={<ExamList />} />
                                        <Route path="exams/category/:categoryId" element={<ExamList />} />
                                        <Route path="exams/create" element={<CreateExam />} />
                                        <Route path="exams/:id" element={<ExamDetail />} />
                                        <Route path="exams/:id/edit" element={<EditExam />} />
                                        <Route path="exams/:id/session" element={<ExamSession />} />
                                        <Route path="exams/:id/monitor" element={<CheatMonitor />} />
                                        <Route path="exams/:id/attempts" element={<ExamAttempts />} />
                                        <Route path="exams/:id/history" element={<ExamHistory />} />
                                    </Route>

                                    <Route path="/student" element={<StudentLayout />}>
                                        <Route index element={<StudentHome />} />
                                        <Route path="history" element={<StudentHistory />} />
                                        <Route path="join" element={<JoinExam />} />
                                        <Route path="exam/:examId" element={<TakeExam />} />
                                    </Route>

                                    <Route path="*" element={<NotFound />} />
                                </Routes>
                            </Suspense>
                        </div>
                    </Router>
                </ToastProvider>
            </DialogProvider>
        </ErrorBoundary>
    );
}

export default App;
