import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import MediGuide from './components/MediGuide';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Forum from './pages/Forum';
import QuestionDetail from './pages/QuestionDetail';
import AskQuestion from './pages/AskQuestion';
import DoctorPortal from './pages/DoctorPortal';
import AdminDashboard from './pages/AdminDashboard';
import Doctors from './pages/Doctors';
import DoctorProfile from './pages/DoctorProfile';
import Hospitals from './pages/Hospitals';
import ConsultationBooking from './pages/ConsultationBooking';
import MyConsultations from './pages/MyConsultations';
import PrivateChats from './pages/PrivateChats';
import Profile from './pages/Profile';
import Faqs from './pages/Faqs';
import Help from './pages/Help';
import ApplyVerification from './pages/ApplyVerification';
import Lounge from './pages/Lounge';
import LoungePostDetail from './pages/LoungePostDetail';
import BloodSOS from './pages/BloodSOS';
import StudentSubmit from './pages/StudentSubmit';
import StudentPortal from './pages/StudentPortal';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" style={{ marginTop: '200px' }} />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

function AppRoutes() {
  const location = useLocation();
  // Don't show the regular Navbar on the admin page — the admin has its own sidebar
  const isAdminPage = location.pathname.startsWith('/admin');

  return (
    <>
      {!isAdminPage && <Navbar />}
      {!isAdminPage && <MediGuide />}
      <Routes>
        <Route path="/"                element={<Landing />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/apply-verification" element={<ApplyVerification />} />
        <Route path="/forum"           element={<Forum />} />
        <Route path="/lounge"          element={<Lounge />} />
        <Route path="/lounge/:id"      element={<LoungePostDetail />} />
        <Route path="/blood-sos"       element={<BloodSOS />} />
        <Route path="/forum/:id"       element={<QuestionDetail />} />
        <Route path="/doctors"         element={<Doctors />} />
        <Route path="/doctors/:id"     element={<DoctorProfile />} />
        <Route path="/hospitals"       element={<Hospitals />} />
        <Route path="/ask"             element={<ProtectedRoute><AskQuestion /></ProtectedRoute>} />
        <Route path="/register-student" element={<StudentSubmit />} />
        <Route path="/student-portal"  element={<ProtectedRoute roles={['student','admin']}><StudentPortal /></ProtectedRoute>} />
        <Route path="/doctor-portal"   element={<ProtectedRoute roles={['doctor','admin']}><DoctorPortal /></ProtectedRoute>} />
        <Route path="/consultation-booking/:doctorId" element={<ProtectedRoute roles={['user','patient']}><ConsultationBooking /></ProtectedRoute>} />
        <Route path="/my-consultations" element={<ProtectedRoute roles={['user','patient']}><MyConsultations /></ProtectedRoute>} />
        <Route path="/private-chats"   element={<ProtectedRoute><PrivateChats /></ProtectedRoute>} />
        <Route path="/profile"         element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/faqs"            element={<Faqs />} />
        <Route path="/help"            element={<ProtectedRoute><Help /></ProtectedRoute>} />
        {/* Admin Panel — has its own login, completely separate from regular user session */}
        <Route path="/admin"           element={<AdminDashboard />} />
        <Route path="*"                element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
