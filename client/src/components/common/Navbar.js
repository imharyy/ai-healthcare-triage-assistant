import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { FiBell, FiMenu, FiX, FiCheck, FiCheckCircle } from 'react-icons/fi';
import { format } from 'date-fns';
import './Navbar.css';

const Navbar = ({ title, onToggleSidebar }) => {
  const { user } = useAuth();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [showNotif, setShowNotif] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="navbar">
      <div className="navbar-left">
        <button className="menu-toggle" onClick={onToggleSidebar}><FiMenu /></button>
        <h1 className="navbar-title">{title}</h1>
      </div>
      <div className="navbar-right">
        <div className="notif-wrapper" ref={ref}>
          <button className="notif-btn" onClick={() => setShowNotif(!showNotif)}>
            <FiBell />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>
          {showNotif && (
            <div className="notif-dropdown">
              <div className="notif-header">
                <h3>Notifications</h3>
                {unreadCount > 0 && <button onClick={markAllRead} className="mark-all"><FiCheckCircle /> Mark all read</button>}
              </div>
              <div className="notif-list">
                {notifications.length === 0 ? (
                  <p className="notif-empty">No notifications</p>
                ) : notifications.slice(0, 20).map(n => (
                  <div key={n._id} className={`notif-item ${n.read ? '' : 'unread'}`}
                    onClick={() => { if (!n.read) markRead(n._id); }}>
                    <p className="notif-msg">{n.message}</p>
                    <span className="notif-time">{format(new Date(n.createdAt), 'MMM d, h:mm a')}</span>
                    {!n.read && <FiCheck className="notif-read-icon" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="navbar-user">
          <div className="avatar avatar-sm">{user?.name?.charAt(0)?.toUpperCase()}</div>
          <span className="navbar-user-name">{user?.name}</span>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
