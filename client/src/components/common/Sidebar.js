import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  FiHome, FiCalendar, FiUsers, FiActivity, FiClipboard,
  FiSettings, FiLogOut, FiMonitor, FiPackage, FiBarChart2,
  FiMessageSquare, FiAlertTriangle, FiDollarSign, FiHeart,
  FiGrid, FiUserPlus, FiLayers, FiVideo
} from 'react-icons/fi';
import './Sidebar.css';

const menuByRole = {
  patient: [
    { to: '/patient/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/patient/appointments', icon: <FiCalendar />, label: 'Appointments' },
    { to: '/patient/queue', icon: <FiUsers />, label: 'Queue Status' },
    { to: '/patient/records', icon: <FiClipboard />, label: 'Medical Records' },
    { to: '/patient/prescriptions', icon: <FiPackage />, label: 'Prescriptions' },
    { to: '/patient/lab-results', icon: <FiActivity />, label: 'Lab Results' },
    { to: '/patient/book-diagnostic', icon: <FiMonitor />, label: 'Lab & Radiology' },
    { to: '/patient/billing', icon: <FiDollarSign />, label: 'Billing' },
    { to: '/patient/telemedicine', icon: <FiVideo />, label: 'Telemedicine' },
    { to: '/patient/emergency', icon: <FiAlertTriangle />, label: 'Emergency' },
    { to: '/patient/ai-assistant', icon: <FiActivity />, label: 'AI Assistant' },
    { to: '/patient/report-analyzer', icon: <FiGrid />, label: 'Report Analyzer' },
    { to: '/patient/feedback', icon: <FiMessageSquare />, label: 'Feedback' },
  ],
  doctor: [
    { to: '/doctor/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/doctor/queue', icon: <FiUsers />, label: 'Patient Queue' },
    { to: '/doctor/appointments', icon: <FiCalendar />, label: 'Appointments' },
    { to: '/doctor/schedule', icon: <FiGrid />, label: 'Schedule' },
    { to: '/doctor/patients', icon: <FiHeart />, label: 'My Patients' },
    { to: '/doctor/prescriptions', icon: <FiPackage />, label: 'Prescriptions' },
    { to: '/doctor/telemedicine', icon: <FiVideo />, label: 'Telemedicine' },
    { to: '/doctor/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
  ],
  receptionist: [
    { to: '/receptionist/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/receptionist/appointments', icon: <FiCalendar />, label: 'Appointments' },
    { to: '/receptionist/walk-in', icon: <FiUserPlus />, label: 'Walk-in' },
    { to: '/receptionist/queue', icon: <FiUsers />, label: 'Queue' },
    { to: '/receptionist/billing', icon: <FiDollarSign />, label: 'Billing' },
    { to: '/receptionist/beds', icon: <FiLayers />, label: 'Bed Management' },
  ],
  admin: [
    { to: '/admin/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
    { to: '/admin/doctors', icon: <FiActivity />, label: 'Doctors' },
    { to: '/admin/departments', icon: <FiGrid />, label: 'Departments' },
    { to: '/admin/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
    { to: '/admin/hospital', icon: <FiMonitor />, label: 'Hospital' },
    { to: '/admin/audit', icon: <FiClipboard />, label: 'Audit Logs' },
    { to: '/admin/settings', icon: <FiSettings />, label: 'Settings' },
  ],
  superadmin: [
    { to: '/admin/dashboard', icon: <FiHome />, label: 'Dashboard' },
    { to: '/admin/users', icon: <FiUsers />, label: 'Users' },
    { to: '/admin/doctors', icon: <FiActivity />, label: 'Doctors' },
    { to: '/admin/departments', icon: <FiGrid />, label: 'Departments' },
    { to: '/admin/analytics', icon: <FiBarChart2 />, label: 'Analytics' },
    { to: '/admin/hospital', icon: <FiMonitor />, label: 'Hospital' },
    { to: '/admin/audit', icon: <FiClipboard />, label: 'Audit Logs' },
    { to: '/admin/settings', icon: <FiSettings />, label: 'Settings' },
  ],
};

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = menuByRole[user?.role] || [];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <FiHeart className="brand-icon" />
        <span>HealHub</span>
      </div>
      <div className="sidebar-user">
        <div className="avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
        <div>
          <p className="user-name">{user?.name}</p>
          <p className="user-role">{user?.role}</p>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map(item => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {item.icon}<span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <button className="sidebar-logout" onClick={handleLogout}>
        <FiLogOut /><span>Logout</span>
      </button>
    </aside>
  );
};

export default Sidebar;
