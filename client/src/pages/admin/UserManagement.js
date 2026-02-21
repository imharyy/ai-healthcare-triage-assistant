import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiPlus, FiEdit, FiTrash2, FiSearch } from 'react-icons/fi';
import toast from 'react-hot-toast';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'patient', phone: '', gender: 'male' });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const params = roleFilter ? `?role=${roleFilter}` : '';
      const { data } = await api.get(`/api/admin/users${params}`);
      setUsers(data.data || data || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [roleFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editUser) {
        await api.put(`/api/admin/users/${editUser._id}`, form);
        toast.success('User updated');
      } else {
        await api.post('/api/admin/users', form);
        toast.success('User created');
      }
      setShowModal(false); setEditUser(null);
      setForm({ name: '', email: '', password: '', role: 'patient', phone: '', gender: 'male' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try {
      await api.delete(`/api/admin/users/${id}`);
      toast.success('User deleted');
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const openEdit = (user) => {
    setEditUser(user);
    setForm({ name: user.name, email: user.email, password: '', role: user.role, phone: user.phone || '', gender: user.gender || 'male' });
    setShowModal(true);
  };

  const filtered = users.filter(u => u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div><h1>User Management</h1><p>Manage all system users</p></div>
        <button className="btn btn-primary" onClick={() => { setEditUser(null); setForm({ name: '', email: '', password: '', role: 'patient', phone: '', gender: 'male' }); setShowModal(true); }}>
          <FiPlus /> Add User
        </button>
      </div>

      <div className="flex gap-3 mb-4 items-center" style={{flexWrap:'wrap'}}>
        <div className="search-box"><FiSearch /><input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} /></div>
        <select className="form-control" style={{maxWidth:'160px'}} value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setLoading(true); }}>
          <option value="">All Roles</option>
          <option value="patient">Patient</option><option value="doctor">Doctor</option>
          <option value="receptionist">Receptionist</option><option value="admin">Admin</option>
        </select>
      </div>

      {loading ? <div className="loading-page"><div className="spinner"></div></div> :
        <div className="table-container card">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u._id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td><span className={`badge badge-${u.role === 'admin' ? 'danger' : u.role === 'doctor' ? 'primary' : u.role === 'receptionist' ? 'warning' : 'info'}`}>{u.role}</span></td>
                  <td>{u.phone || '--'}</td>
                  <td><span className={`badge ${u.isActive !== false ? 'badge-success' : 'badge-gray'}`}>{u.isActive !== false ? 'Active' : 'Inactive'}</span></td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-sm btn-secondary" onClick={() => openEdit(u)}><FiEdit /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => deleteUser(u._id)}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editUser ? 'Edit User' : 'Add User'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label>Name</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div className="form-group"><label>Email</label><input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                {!editUser && <div className="form-group"><label>Password</label><input type="password" className="form-control" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required /></div>}
                <div className="form-row">
                  <div className="form-group"><label>Role</label>
                    <select className="form-control" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                      <option value="patient">Patient</option><option value="doctor">Doctor</option><option value="receptionist">Receptionist</option><option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Phone</label><input className="form-control" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                </div>
                <div className="modal-footer" style={{padding:'16px 0 0',border:'none'}}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editUser ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
