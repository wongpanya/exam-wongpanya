import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DialogProvider } from './components/DialogProvider';
import Register from './pages/Register';
import Login from './pages/Login';
import Home from './pages/Home';
import TeacherLayout from './components/TeacherLayout';
import TeacherHome from './pages/teacher/TeacherHome';
import StudentList from './pages/teacher/StudentList';
import ExamList from './pages/teacher/ExamList';
import CreateExam from './pages/teacher/CreateExam';
import ExamDetail from './pages/teacher/ExamDetail';
import EditExam from './pages/teacher/EditExam';
import ExamSession from './pages/teacher/ExamSession';
import CheatMonitor from './pages/teacher/CheatMonitor';
import ExamHistory from './pages/teacher/ExamHistory';
import ExamAttempts from './pages/teacher/ExamAttempts';
import StudentLayout from './components/StudentLayout';
import StudentHome from './pages/student/StudentHome';
import JoinExam from './pages/student/JoinExam';
import TakeExam from './pages/student/TakeExam';

function App() {
  return (
    <DialogProvider>
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />

          {/* Teacher Routes with Sidebar Layout */}
          <Route path="/teacher" element={<TeacherLayout />}>
            <Route index element={<TeacherHome />} />
            <Route path="students" element={<StudentList />} />
            <Route path="exams" element={<ExamList />} />
            <Route path="exams/create" element={<CreateExam />} />
            <Route path="exams/:id" element={<ExamDetail />} />
            <Route path="exams/:id/edit" element={<EditExam />} />
            <Route path="exams/:id/session" element={<ExamSession />} />
            <Route path="exams/:id/monitor" element={<CheatMonitor />} />
            <Route path="exams/:id/attempts" element={<ExamAttempts />} />
            <Route path="exams/:id/history" element={<ExamHistory />} />
          </Route>

          {/* Student Routes */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentHome />} />
            <Route path="join" element={<JoinExam />} />
            <Route path="exam/:examId" element={<TakeExam />} />
          </Route>
        </Routes>
      </div>
    </Router>
    </DialogProvider>
  );
}

export default App;
