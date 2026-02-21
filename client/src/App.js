import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import DashboardLayout from './components/common/DashboardLayout';

// Auth pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Patient pages
import PatientDashboard from './pages/patient/Dashboard';
import BookAppointment from './pages/patient/BookAppointment';
import PatientAppointments from './pages/patient/Appointments';
import QueueStatus from './pages/patient/QueueStatus';
import MedicalRecords from './pages/patient/MedicalRecords';
import PatientPrescriptions from './pages/patient/Prescriptions';
import LabResults from './pages/patient/LabResults';
import PatientBilling from './pages/patient/Billing';
import PatientTelemedicine from './pages/patient/Telemedicine';
import Emergency from './pages/patient/Emergency';
import PatientFeedback from './pages/patient/Feedback';
import AIAssistant from './pages/patient/AIAssistant';
import BookDiagnostic from './pages/patient/BookDiagnostic';
import ReportAnalyzer from './pages/patient/ReportAnalyzer';

// Doctor pages
import DoctorDashboard from './pages/doctor/Dashboard';
import DoctorQueue from './pages/doctor/QueueManagement';
import DoctorAppointments from './pages/doctor/Appointments';
import DoctorSchedule from './pages/doctor/Schedule';
import DoctorPatients from './pages/doctor/Patients';
import DoctorPrescriptions from './pages/doctor/Prescriptions';
import DoctorTelemedicine from './pages/doctor/Telemedicine';
import DoctorAnalytics from './pages/doctor/Analytics';

// Receptionist pages
import ReceptionistDashboard from './pages/receptionist/Dashboard';
import ReceptionistAppointments from './pages/receptionist/Appointments';
import WalkIn from './pages/receptionist/WalkIn';
import ReceptionistQueue from './pages/receptionist/Queue';
import ReceptionistBilling from './pages/receptionist/Billing';
import BedManagement from './pages/receptionist/BedManagement';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import DoctorManagement from './pages/admin/DoctorManagement';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import AdminAnalytics from './pages/admin/Analytics';
import HospitalSettings from './pages/admin/HospitalSettings';
import AuditLogs from './pages/admin/AuditLogs';
import AdminSettings from './pages/admin/Settings';

const HomeRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  const map = { patient: '/patient/dashboard', doctor: '/doctor/dashboard', receptionist: '/receptionist/dashboard', admin: '/admin/dashboard', superadmin: '/admin/dashboard' };
  return <Navigate to={map[user.role] || '/login'} />;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Patient Routes */}
      <Route path="/patient" element={<ProtectedRoute roles={['patient']}><DashboardLayout title="Patient Portal" /></ProtectedRoute>}>
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="appointments" element={<PatientAppointments />} />
        <Route path="book-appointment" element={<BookAppointment />} />
        <Route path="queue" element={<QueueStatus />} />
        <Route path="records" element={<MedicalRecords />} />
        <Route path="prescriptions" element={<PatientPrescriptions />} />
        <Route path="lab-results" element={<LabResults />} />
        <Route path="billing" element={<PatientBilling />} />
        <Route path="telemedicine" element={<PatientTelemedicine />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="feedback" element={<PatientFeedback />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="book-diagnostic" element={<BookDiagnostic />} />
        <Route path="report-analyzer" element={<ReportAnalyzer />} />
      </Route>

      {/* Doctor Routes */}
      <Route path="/doctor" element={<ProtectedRoute roles={['doctor']}><DashboardLayout title="Doctor Portal" /></ProtectedRoute>}>
        <Route path="dashboard" element={<DoctorDashboard />} />
        <Route path="queue" element={<DoctorQueue />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="schedule" element={<DoctorSchedule />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="prescriptions" element={<DoctorPrescriptions />} />
        <Route path="telemedicine" element={<DoctorTelemedicine />} />
        <Route path="analytics" element={<DoctorAnalytics />} />
      </Route>

      {/* Receptionist Routes */}
      <Route path="/receptionist" element={<ProtectedRoute roles={['receptionist']}><DashboardLayout title="Reception" /></ProtectedRoute>}>
        <Route path="dashboard" element={<ReceptionistDashboard />} />
        <Route path="appointments" element={<ReceptionistAppointments />} />
        <Route path="walk-in" element={<WalkIn />} />
        <Route path="queue" element={<ReceptionistQueue />} />
        <Route path="billing" element={<ReceptionistBilling />} />
        <Route path="beds" element={<BedManagement />} />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute roles={['admin', 'superadmin']}><DashboardLayout title="Admin Panel" /></ProtectedRoute>}>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="doctors" element={<DoctorManagement />} />
        <Route path="departments" element={<DepartmentManagement />} />
        <Route path="analytics" element={<AdminAnalytics />} />
        <Route path="hospital" element={<HospitalSettings />} />
        <Route path="audit" element={<AuditLogs />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default App;
