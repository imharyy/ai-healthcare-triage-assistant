import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', head: '' });
  const [doctors, setDoctors] = useState([]);
  const [hospitalId, setHospitalId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const hosRes = await api.get('/api/hospitals');
        const h = (hosRes.data.data || hosRes.data)?.[0];
        if (h?._id) {
          setHospitalId(h._id);
          const [deptRes, docRes] = await Promise.all([
            api.get(`/api/hospitals/${h._id}/departments`),
            api.get('/api/admin/users?role=doctor')
          ]);
          setDepartments(deptRes.data.data || deptRes.data || []);
          setDoctors(docRes.data.data || docRes.data || []);
        }
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editDept) {
        await api.put(`/api/hospitals/${hospitalId}/departments/${editDept._id}`, form);
        toast.success('Updated');
      } else {
        await api.post(`/api/hospitals/${hospitalId}/departments`, form);
        toast.success('Created');
      }
      setShowModal(false);
      const { data } = await api.get(`/api/hospitals/${hospitalId}/departments`);
      setDepartments(data.data || data || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteDept = async (id) => {
    if (!window.confirm('Delete department?')) return;
    try {
      await api.delete(`/api/hospitals/${hospitalId}/departments/${id}`);
      toast.success('Deleted');
      setDepartments(prev => prev.filter(d => d._id !== id));
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div className="loading-page"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header flex justify-between items-center">
        <div><h1>Departments</h1><p>Manage hospital departments</p></div>
        <button className="btn btn-primary" onClick={() => { setEditDept(null); setForm({ name: '', description: '', head: '' }); setShowModal(true); }}><FiPlus /> Add Department</button>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'16px'}}>
        {departments.map(dept => (
          <div key={dept._id} className="card">
            <div className="flex justify-between items-center mb-2">
              <h3 style={{fontWeight:700}}>{dept.name}</h3>
              <div className="flex gap-2">
                <button className="btn btn-sm btn-secondary" onClick={() => { setEditDept(dept); setForm({ name: dept.name, description: dept.description || '', head: dept.head?._id || '' }); setShowModal(true); }}><FiEdit /></button>
                <button className="btn btn-sm btn-danger" onClick={() => deleteDept(dept._id)}><FiTrash2 /></button>
              </div>
            </div>
            {dept.description && <p style={{fontSize:'13px',color:'var(--gray-500)',marginBottom:'8px'}}>{dept.description}</p>}
            <p style={{fontSize:'13px'}}>Doctors: <strong>{dept.doctors?.length || 0}</strong></p>
            {dept.head && <p style={{fontSize:'13px'}}>Head: <strong>Dr. {dept.head.name || dept.head}</strong></p>}
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editDept ? 'Edit Department' : 'Add Department'}</h2>
              <button className="btn btn-icon btn-secondary" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group"><label>Name</label><input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div className="form-group"><label>Description</label><textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <div className="form-group"><label>Department Head</label>
                  <select className="form-control" value={form.head} onChange={e => setForm({...form, head: e.target.value})}>
                    <option value="">Select doctor</option>
                    {doctors.map(d => <option key={d._id} value={d._id}>Dr. {d.name}</option>)}
                  </select>
                </div>
                <div className="modal-footer" style={{padding:'16px 0 0',border:'none'}}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">{editDept ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
