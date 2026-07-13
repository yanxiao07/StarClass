import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import Login from './features/auth/Login';
import Register from './features/auth/Register';
import Profile from './features/auth/Profile';
import StudentDashboard from './features/dashboard/StudentDashboard';
import TeacherDashboard from './features/dashboard/TeacherDashboard';
import LevelPage from './features/dashboard/LevelPage';
import StudentHomework from './features/homework/StudentHomework';
import TeacherHomework from './features/homework/TeacherHomework';
import TeacherStudents from './features/homework/TeacherStudents';
import TeacherSubmissions from './features/homework/TeacherSubmissions';
import MyClasses from './features/class/MyClasses';
import ClassChat from './features/class/ClassChat';
import Games from './features/games';
import AIChat from './features/games/AIChat';
import StarStore from './features/store/StarStore';
import AgentChat from './features/agents/AgentChat';
import './styles/Minimal.css';
import StarDecoration from './components/StarDecoration';
import { classApi } from './services/class';
import { chatApi } from './services/chat';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>加载中...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [newMessagesCount, setNewMessagesCount] = useState(0);

  const countNewMessages = async () => {
    if (!user) return;

    try {
      let totalNew = 0;

      if (user.role === 'teacher') {
        const teacherClasses = await classApi.getTeacherClasses();
        for (const cls of teacherClasses) {
          try {
            const isMuted = localStorage.getItem(`muted_${user.id}_${cls.id}`) === 'true';
            if (isMuted) continue;

            const messages = await chatApi.getClassMessages(cls.id);
            const otherMessages = messages.filter((msg: any) => msg.sender.id !== user.id);
            if (otherMessages.length > 0) {
              const lastViewed = localStorage.getItem(`lastViewed_${user.id}_${cls.id}`);
              if (!lastViewed) {
                totalNew += otherMessages.length;
              } else {
                const newMessages = otherMessages.filter(
                  (msg: any) => new Date(msg.createdAt) > new Date(lastViewed)
                );
                totalNew += newMessages.length;
              }
            }
          } catch (err) {
            console.log(`Failed to count messages for class ${cls.id}`);
          }
        }
      } else if (user.classId) {
        try {
          const isMuted = localStorage.getItem(`muted_${user.id}_${user.classId}`) === 'true';
          if (!isMuted) {
            const messages = await chatApi.getClassMessages(user.classId);
            const otherMessages = messages.filter((msg: any) => msg.sender.id !== user.id);
            if (otherMessages.length > 0) {
              const lastViewed = localStorage.getItem(`lastViewed_${user.id}_${user.classId}`);
              if (!lastViewed) {
                totalNew = otherMessages.length;
              } else {
                totalNew = otherMessages.filter(
                  (msg: any) => new Date(msg.createdAt) > new Date(lastViewed)
                ).length;
              }
            }
          }
        } catch (err) {
          console.log(`Failed to count messages for class ${user.classId}`);
        }
      }

      setNewMessagesCount(totalNew);
    } catch (err) {
      console.log('Failed to count new messages:', err);
    }
  };

  useEffect(() => {
    if (user) {
      countNewMessages();

      const interval = setInterval(() => {
        countNewMessages();
      }, 10000);

      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user) return null;

  const isStudentWithoutClass = user.role === 'student' && !user.classId;

  const renderClassLink = () => {
    return (
      <a href="/classes" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
        班级
        {newMessagesCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-8px',
            right: '-12px',
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '10px',
            fontWeight: 'bold',
            padding: '2px 6px',
            borderRadius: '10px',
            minWidth: '18px',
            textAlign: 'center'
          }}>
            {newMessagesCount > 99 ? '99+' : newMessagesCount}
          </span>
        )}
      </a>
    );
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">⭐ 星学园</div>
      <div className="nav-links">
        {user.role === 'student' && !isStudentWithoutClass && (
          <>
            <a href="/">首页</a>
            <a href="/homework">作业</a>
            {renderClassLink()}
            <a href="/games">游戏</a>
            <a href="/ai-chat">AI助手</a>
            <a href="/agents">智能体</a>
            <a href="/store">商城</a>
          </>
        )}
        {user.role === 'student' && isStudentWithoutClass && (
          <>
            {renderClassLink()}
          </>
        )}
        {user.role === 'teacher' && (
          <>
            <a href="/">首页</a>
            <a href="/homework">作业</a>
            <a href="/students">学生</a>
            {renderClassLink()}
          </>
        )}
        <a href="/profile">个人中心</a>
        <button onClick={logout} className="btn btn-secondary">退出</button>
      </div>
    </nav>
  );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();

  const themeClass = user?.theme ? `theme-${user.theme}` : '';
  const isStudentWithoutClass = user?.role === 'student' && !user.classId;

  return (
    <div className={`app ${themeClass}`}>
      <StarDecoration />
      {user && <Navbar />}
      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {isStudentWithoutClass ? <Navigate to="/classes" /> : (user?.role === 'student' ? <StudentDashboard /> : <TeacherDashboard />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/homework"
            element={
              <ProtectedRoute>
                {isStudentWithoutClass ? <Navigate to="/classes" /> : (user?.role === 'student' ? <StudentHomework /> : <TeacherHomework />)}
              </ProtectedRoute>
            }
          />
          <Route
            path="/students"
            element={
              <ProtectedRoute>
                <TeacherStudents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submissions"
            element={
              <ProtectedRoute>
                <TeacherSubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/classes"
            element={
              <ProtectedRoute>
                <MyClasses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/games"
            element={
              <ProtectedRoute>
                {isStudentWithoutClass ? <Navigate to="/classes" /> : <Games />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/class/:classId/chat"
            element={
              <ProtectedRoute>
                {isStudentWithoutClass ? <Navigate to="/classes" /> : <ClassChat />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-chat"
            element={
              <ProtectedRoute>
                {isStudentWithoutClass ? <Navigate to="/classes" /> : <AIChat />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/level"
            element={
              <ProtectedRoute>
                {isStudentWithoutClass ? <Navigate to="/classes" /> : <LevelPage />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/store"
            element={
              <ProtectedRoute>
                {isStudentWithoutClass ? <Navigate to="/classes" /> : <StarStore />}
              </ProtectedRoute>
            }
          />
          <Route
            path="/agents"
            element={
              <ProtectedRoute>
                {isStudentWithoutClass ? <Navigate to="/classes" /> : <AgentChat />}
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
};

export default App;
