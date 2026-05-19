import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { getOrgStats, getAuditLogs, createCycle, unlockGoalSheet, fastForwardCycle } from '../lib/admin';
import { runEscalationCheck, saveEscalations, ESCALATION_RULES } from '../lib/escalation';
import { exportAchievementReport, exportAuditLog } from '../lib/export';
import { formatDateTime } from '../lib/utils';
import { Download, Plus, AlertTriangle, ShieldAlert, Unlock, RefreshCw, Calendar, Zap, Target, BarChart3, Settings, FileText, ClipboardList, CheckCircle2 } from 'lucide-react';

export default function AdminDashboard() {
  const { user, cycle } = useAuth();
  const { showToast } = useToast();
  
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  
  // Escape key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowCycleModal(false);
        setShowUnlockModal(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
  
  // Forms
  const [cycleForm, setCycleForm] = useState({
    cycleId: '', name: '', goalSettingOpen: '', goalSettingClose: '',
    q1Open: '', q1Close: '', q2Open: '', q2Close: '', q3Open: '', q3Close: '', q4Open: '', q4Close: ''
  });
  
  const [unlockData, setUnlockData] = useState({ sheetId: '', reason: '' });
  const [unlockSearch, setUnlockSearch] = useState('');

  const loadData = async () => {
    if (cycle) {
      const orgStats = await getOrgStats(cycle.id);
      if (orgStats) {
        setStats(orgStats);
        const escs = await runEscalationCheck(cycle, orgStats.users, orgStats.sheets, orgStats.checkins);
        setEscalations(escs);
      }
    }
    
    const logs = await getAuditLogs(50);
    setAuditLogs(logs);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [cycle]);

  const handleCreateCycle = async () => {
    try {
      const data = {
        cycleId: cycleForm.cycleId,
        name: cycleForm.name,
        goalSettingOpen: cycleForm.goalSettingOpen,
        goalSettingClose: cycleForm.goalSettingClose,
        quarters: {
          Q1: { open: cycleForm.q1Open, close: cycleForm.q1Close },
          Q2: { open: cycleForm.q2Open, close: cycleForm.q2Close },
          Q3: { open: cycleForm.q3Open, close: cycleForm.q3Close },
          Q4: { open: cycleForm.q4Open, close: cycleForm.q4Close }
        },
        createdBy: user.uid
      };
      
      if (!data.cycleId || !data.name) {
        showToast('Cycle ID and Name are required', 'warn');
        return;
      }
      
      await createCycle(data);
      showToast('Cycle created successfully. Reloading...', 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch(e) {
      showToast('Failed to create cycle', 'error');
    }
  };

  const handleAutoFillCycle = () => {
    const now = new Date();
    const fmt = (d) => d.toISOString().split('T')[0];
    const offset = (days) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      return fmt(d);
    };

    setCycleForm({
      cycleId: 'FY-2025-2026',
      name: 'FY 2025-2026',
      goalSettingOpen: offset(-30),
      goalSettingClose: offset(-9),
      q1Open: offset(-8),
      q1Close: offset(27),
      q2Open: offset(40),
      q2Close: offset(70),
      q3Open: offset(130),
      q3Close: offset(160),
      q4Open: offset(220),
      q4Close: offset(250)
    });
    showToast('Auto-filled with active Q1 dates!', 'success');
  };

  const handleUnlock = async () => {
    if (!unlockData.reason) {
      showToast('Reason is required', 'warn');
      return;
    }
    try {
      await unlockGoalSheet(unlockData.sheetId, user.uid, unlockData.reason);
      showToast('Goal sheet unlocked', 'success');
      setShowUnlockModal(false);
      setUnlockData({ sheetId: '', reason: '' });
      loadData();
    } catch(e) {
      showToast('Failed to unlock goal sheet', 'error');
    }
  };

  const runEscalationsNow = async () => {
    if (!stats || !cycle) return;
    try {
      const escs = await runEscalationCheck(cycle, stats.users, stats.sheets, stats.checkins);
      await saveEscalations(escs);
      setEscalations(escs);
      showToast(`Checked. ${escs.length} escalations found/updated.`, 'info');
    } catch(e) {
      showToast('Failed to run escalations', 'error');
    }
  };
  const handleFastForward = async (phase) => {
    if (!cycle) {
      showToast('No active cycle to fast forward', 'warn');
      return;
    }
    try {
      await fastForwardCycle(cycle.id, phase);
      showToast(`Time Machine Active: Switched to ${phase === 'goal_setting' ? 'Goal Setting' : phase} window!`, 'success');
      setTimeout(() => window.location.reload(), 1500);
    } catch(e) {
      showToast('Failed to fast forward cycle', 'error');
    }
  };

  if (loading) return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div className="page-header"><div><h1>Admin Dashboard</h1><p>Loading organization data...</p></div></div>
      <div className="grid grid-4 gap-md" style={{ marginBottom: '24px' }}>
        {[1,2,3,4].map(i => <div key={i} className="card card-stat"><div className="skeleton" style={{ height: '60px' }}></div></div>)}
      </div>
      <div className="grid grid-2 gap-lg"><div className="card"><div className="skeleton" style={{ height: '200px' }}></div></div><div className="card"><div className="skeleton" style={{ height: '200px' }}></div></div></div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h1>Admin Dashboard</h1>
          <p>Organization overview & governance</p>
        </div>
        <div className="flex gap-sm">
          <button className="btn btn-secondary btn-sm" onClick={() => exportAchievementReport(stats?.sheets || [], cycle?.id)}>
            <Download size={14}/> Export Report
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => exportAuditLog(auditLogs)}>
            <Download size={14}/> Export Audit Log
          </button>
        </div>
      </div>

      {/* DEMO TIME MACHINE TOOLBAR */}
      <div className="card" style={{ 
        background: 'linear-gradient(135deg, rgba(91,95,255,0.1) 0%, rgba(155,89,255,0.05) 100%)', 
        border: '1px dashed rgba(91,95,255,0.4)', 
        padding: '20px 24px', 
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(91,95,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B5FFF' }}>
            <Zap size={20}/>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Demo Time Machine <span style={{ background: '#5B5FFF', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>Hackathon Mode</span>
            </h4>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)' }}>
              Instantly warp organizational timelines to test submission locks, check-in windows, and dynamic dashboards.
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => handleFastForward('goal_setting')} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(91,95,255,0.15)', borderColor: 'rgba(91,95,255,0.3)', color: '#fff', cursor: 'pointer' }}>
            <Target size={14} /> Goal Setting
          </button>
          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => (
            <button key={q} className="btn btn-secondary btn-sm" onClick={() => handleFastForward(q)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,212,170,0.15)', borderColor: 'rgba(0,212,170,0.3)', color: '#fff', cursor: 'pointer' }}>
              <Calendar size={14} /> {q} Check-in
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-4 gap-md" style={{ marginBottom: '24px' }}>
        <div className="card card-stat">
          <div className="stat-value">{stats?.totalEmployees || 0}</div>
          <div className="stat-label">Total Employees</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value text-primary">{stats?.submittedCount || 0}</div>
          <div className="stat-label">Sheets Submitted</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value text-success">{stats?.approvalRate || 0}%</div>
          <div className="stat-label">Approval Rate</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value">{stats?.checkinsCount || 0}</div>
          <div className="stat-label">Check-ins Done</div>
        </div>
      </div>

      <div className="grid grid-2 gap-lg" style={{ marginBottom: '24px' }}>
        {/* Heatmap */}
        <div className="card">
          <div className="card-header">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><BarChart3 size={18} color="#5B5FFF"/> Org Completion Heatmap</h4>
          </div>
          {stats?.departments ? (
            <div style={{ display: 'grid', gap: '2px', gridTemplateColumns: '120px repeat(5, 1fr)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DEPT</div>
              {['Draft', 'Submitted', 'Approved', 'Returned', 'Not Started'].map(l => (
                <div key={l} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center' }}>{l}</div>
              ))}
              
              {Object.keys(stats.departments).map(dept => {
                const d = stats.departments[dept];
                const keys = ['draft', 'submitted', 'approved', 'returned', 'notStarted'];
                return (
                  <React.Fragment key={dept}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>{dept}</div>
                    {keys.map((k, i) => {
                      const val = d[k] || 0;
                      const max = d.total || 1;
                      const intensity = val / max;
                      const colors = [
                        'rgba(255, 165, 2, ',   // draft
                        'rgba(91, 95, 255, ',   // submitted
                        'rgba(0, 212, 170, ',   // approved
                        'rgba(255, 71, 87, ',   // returned
                        'rgba(74, 74, 106, '    // notStarted
                      ];
                      const bg = `${colors[i]}${Math.max(0.1, intensity)})`;
                      return (
                        <div key={k} style={{ background: bg, padding: '8px', textAlign: 'center', borderRadius: '4px', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                          {val}
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          ) : <div className="empty-state"><p>No data available</p></div>}
        </div>

        {/* Cycle Management */}
        <div className="card">
          <div className="card-header">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Settings size={18} color="#9B59FF"/> Cycle Management</h4>
            <button className="btn btn-primary btn-sm" onClick={() => setShowCycleModal(true)}>
              <Plus size={14}/> New Cycle
            </button>
          </div>
          {cycle ? (
            <div>
              <div style={{ marginBottom: '16px' }}><span style={{ color: 'var(--text-muted)' }}>Active:</span> <strong>{cycle.name}</strong> ({cycle.cycleId})</div>
              <div className="grid grid-2 gap-sm" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Goal Setting</div>
                  <div>{cycle.goalSettingOpen} to {cycle.goalSettingClose}</div>
                </div>
                {['Q1','Q2','Q3','Q4'].map(q => (
                  <div key={q} style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{q} Window</div>
                    <div>{cycle.quarters[q]?.open} to {cycle.quarters[q]?.close}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p style={{ color: 'var(--text-muted)' }}>No active cycle.</p>}
        </div>
      </div>

      <div className="grid grid-2 gap-lg" style={{ marginBottom: '24px' }}>
        {/* Escalations */}
        <div className="card">
          <div className="card-header">
            <h4><AlertTriangle size={18} style={{ display: 'inline', color: 'var(--accent-warn)' }}/> Escalations</h4>
            <button className="btn btn-ghost btn-sm" onClick={runEscalationsNow}>
              <RefreshCw size={14}/> Check Now
            </button>
          </div>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {escalations.filter(e => !e.resolved).length === 0 ? (
              <div className="empty-state" style={{ padding: '20px' }}>
                <ShieldAlert size={32} style={{ color: 'var(--accent-secondary)', opacity: 0.5, marginBottom: '12px' }}/>
                <p>All clear — no active escalations</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {escalations.filter(e => !e.resolved).map((e, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                    <div style={{ flex: 1 }}>
                      <strong>{e.targetUserName || 'Unknown'}</strong>
                      <div style={{ color: 'var(--text-muted)' }}>{e.message}</div>
                    </div>
                    <span style={{ fontWeight: 600, color: e.level === 3 ? '#ff0040' : e.level === 2 ? 'var(--accent-danger)' : 'var(--accent-warn)' }}>
                      L{e.level}
                    </span>
                    <span className="text-mono text-muted">{e.daysSinceOpen}d</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Unlock Exception Handling */}
        <div className="card">
          <div className="card-header">
            <h4><Unlock size={18} style={{ display: 'inline' }}/> Exception Handling (Unlock)</h4>
          </div>
          <input 
            className="form-input" 
            placeholder="Search employee name..." 
            value={unlockSearch}
            onChange={e => setUnlockSearch(e.target.value)}
            style={{ marginBottom: '16px' }}
          />
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            {stats?.sheets && stats.sheets.filter(s => s.status === 'approved' && s.employeeName.toLowerCase().includes(unlockSearch.toLowerCase())).length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No locked sheets found.</p>
            ) : (
              stats?.sheets.filter(s => s.status === 'approved' && s.employeeName.toLowerCase().includes(unlockSearch.toLowerCase())).map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <strong style={{ fontSize: '0.9rem' }}>{s.employeeName}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.department}</div>
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={() => { setUnlockData({ ...unlockData, sheetId: s.id }); setShowUnlockModal(true); }}>
                    Unlock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Completion Dashboard — BRD Section 4 Requirement */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-header">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><CheckCircle2 size={18} color="#00D4AA"/> Completion Dashboard</h4>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Department</th>
                <th>Goal Status</th>
                <th>Q1</th>
                <th>Q2</th>
                <th>Q3</th>
                <th>Q4</th>
              </tr>
            </thead>
            <tbody>
              {stats?.users?.filter(u => u.role === 'employee').length === 0 ? (
                <tr><td colSpan="7" className="text-center text-muted">No employees found.</td></tr>
              ) : (
                stats?.users?.filter(u => u.role === 'employee').map(emp => {
                  const empSheet = stats.sheets.find(s => s.employeeId === emp.uid);
                  const sheetStatus = empSheet?.status || 'not_started';
                  const statusBadge = {
                    approved: { bg: 'rgba(0,212,170,0.15)', color: '#00D4AA' },
                    submitted: { bg: 'rgba(91,95,255,0.15)', color: '#5B5FFF' },
                    draft: { bg: 'rgba(255,165,2,0.15)', color: '#FFA502' },
                    returned: { bg: 'rgba(255,71,87,0.15)', color: '#FF4757' },
                    not_started: { bg: 'rgba(74,74,106,0.15)', color: '#4A4A6A' }
                  }[sheetStatus] || { bg: 'transparent', color: 'var(--text-muted)' };
                  
                  return (
                    <tr key={emp.uid}>
                      <td style={{ fontWeight: 600 }}>{emp.name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{emp.department}</td>
                      <td>
                        <span className="badge" style={{ background: statusBadge.bg, color: statusBadge.color, fontSize: '0.75rem' }}>
                          {sheetStatus.replace('_', ' ')}
                        </span>
                      </td>
                      {['Q1','Q2','Q3','Q4'].map(q => {
                        const done = stats.checkins.some(c => c.employeeId === emp.uid && c.quarter === q);
                        return (
                          <td key={q} style={{ textAlign: 'center' }}>
                            {done 
                              ? <CheckCircle2 size={16} color="#00D4AA" /> 
                              : <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                            }
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audit Log */}
      <div className="card">
        <div className="card-header">
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><ClipboardList size={18} color="#00D4AA"/> Audit Trail</h4>
        </div>
        <div className="table-container" style={{ border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Action</th>
                <th>Target ID</th>
                <th>Performed By</th>
                <th>Role</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted">No audit entries.</td></tr>
              ) : (
                auditLogs.map((l, i) => (
                  <tr key={i}>
                    <td className="text-mono" style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{formatDateTime(l.timestamp)}</td>
                    <td><span className="badge badge-info">{l.action.replace(/_/g, ' ')}</span></td>
                    <td className="text-mono" style={{ fontSize: '0.8rem' }}>{l.targetId?.substring(0, 10)}...</td>
                    <td>{l.performedBy?.substring(0, 8)}...</td>
                    <td>{l.performedByRole}</td>
                    <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cycle Modal */}
      {showCycleModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3>Create New Cycle</h3>
              <button className="modal-close" onClick={() => setShowCycleModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleAutoFillCycle}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(91,95,255,0.15)', borderColor: 'rgba(91,95,255,0.3)', color: '#fff', cursor: 'pointer' }}
                >
                  <Zap size={14} color="var(--accent-primary)"/> Auto-Fill Demo Dates
                </button>
              </div>
              <div className="grid grid-2 gap-md">
                <div className="form-group"><label className="form-label">Cycle ID</label><input className="form-input" value={cycleForm.cycleId} onChange={e => setCycleForm({...cycleForm, cycleId: e.target.value})} placeholder="e.g. FY2025-26" /></div>
                <div className="form-group"><label className="form-label">Cycle Name</label><input className="form-input" value={cycleForm.name} onChange={e => setCycleForm({...cycleForm, name: e.target.value})} placeholder="e.g. FY 2025-26" /></div>
                <div className="form-group"><label className="form-label">Goal Setting Opens</label><input type="date" className="form-input" value={cycleForm.goalSettingOpen} onChange={e => setCycleForm({...cycleForm, goalSettingOpen: e.target.value})} /></div>
                <div className="form-group"><label className="form-label">Goal Setting Closes</label><input type="date" className="form-input" value={cycleForm.goalSettingClose} onChange={e => setCycleForm({...cycleForm, goalSettingClose: e.target.value})} /></div>
              </div>
              
              <h5 style={{ margin: '16px 0 8px' }}>Quarter Windows</h5>
              <div className="grid grid-2 gap-md">
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Q1 Open</label><input type="date" className="form-input" value={cycleForm.q1Open} onChange={e => setCycleForm({...cycleForm, q1Open: e.target.value})} /></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Q1 Close</label><input type="date" className="form-input" value={cycleForm.q1Close} onChange={e => setCycleForm({...cycleForm, q1Close: e.target.value})} /></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Q2 Open</label><input type="date" className="form-input" value={cycleForm.q2Open} onChange={e => setCycleForm({...cycleForm, q2Open: e.target.value})} /></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Q2 Close</label><input type="date" className="form-input" value={cycleForm.q2Close} onChange={e => setCycleForm({...cycleForm, q2Close: e.target.value})} /></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Q3 Open</label><input type="date" className="form-input" value={cycleForm.q3Open} onChange={e => setCycleForm({...cycleForm, q3Open: e.target.value})} /></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Q3 Close</label><input type="date" className="form-input" value={cycleForm.q3Close} onChange={e => setCycleForm({...cycleForm, q3Close: e.target.value})} /></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Q4 Open</label><input type="date" className="form-input" value={cycleForm.q4Open} onChange={e => setCycleForm({...cycleForm, q4Open: e.target.value})} /></div>
                <div className="form-group" style={{ margin: 0 }}><label className="form-label">Q4 Close</label><input type="date" className="form-input" value={cycleForm.q4Close} onChange={e => setCycleForm({...cycleForm, q4Close: e.target.value})} /></div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCycleModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateCycle}>Create Cycle</button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3>Unlock Goal Sheet</h3>
              <button className="modal-close" onClick={() => setShowUnlockModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>This will unlock the goal sheet, allowing the employee to edit their goals. This action is logged.</p>
              <div className="form-group">
                <label className="form-label">Reason for Unlock *</label>
                <textarea 
                  className="form-textarea" 
                  rows="3" 
                  placeholder="Provide reason for audit log..."
                  value={unlockData.reason}
                  onChange={e => setUnlockData({...unlockData, reason: e.target.value})}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowUnlockModal(false)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleUnlock}>Unlock Goals</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
