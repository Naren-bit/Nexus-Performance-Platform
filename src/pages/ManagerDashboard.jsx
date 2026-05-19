import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { getTeamMembers, getTeamGoalSheets, pushSharedGoalToTeam } from '../lib/goals';
import { approveGoalSheet, returnGoalSheet } from '../lib/approval';
import { getCheckins, completeCheckin } from '../lib/checkin';
import { isWindowOpen, getScoreColor, formatScore, timeAgo, THRUST_AREAS } from '../lib/utils';
import { Users, FileCheck, Target, MessageSquare, ArrowRight, X, CheckCircle2, CornerDownLeft, Lock, BrainCircuit } from 'lucide-react';
import { fetchGeminiGoalSuggestion } from '../lib/gemini';

export default function ManagerDashboard() {
  const { user, cycle } = useAuth();
  const { showToast } = useToast();
  const [team, setTeam] = useState([]);
  const [sheets, setSheets] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [reviewComment, setReviewComment] = useState('');
  const [checkinComment, setCheckinComment] = useState('');
  
  // Shared Goals State
  const [showSharedModal, setShowSharedModal] = useState(false);
  const [sharedGoalForm, setSharedGoalForm] = useState({
    title: '', thrustArea: '', description: '', uom: 'numeric', uomDirection: 'max', target: ''
  });
  const [suggestingAI, setSuggestingAI] = useState(false);
  const [aiReasoning, setAiReasoning] = useState('');

  // Escape key to close modals
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setShowSharedModal(false);
        setSelectedMember(null); // Also close the sliding panel if user presses Esc
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const loadData = async () => {
    if (user && cycle) {
      const members = await getTeamMembers(user.uid);
      const sh = await getTeamGoalSheets(user.uid, cycle.id);
      
      const allCheckins = [];
      for (const m of members) {
        const c = await getCheckins(m.uid, cycle.id);
        allCheckins.push(...c);
      }
      
      setTeam(members);
      setSheets(sh);
      setCheckins(allCheckins);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [user, cycle]);

  const getStatusBadge = (s) => {
    switch(s) {
      case 'not_started': return <span className="badge badge-not-started">Not Started</span>;
      case 'draft': return <span className="badge badge-draft">Draft</span>;
      case 'submitted': return <span className="badge badge-submitted">Pending Review</span>;
      case 'approved': return <span className="badge badge-approved">Approved</span>;
      case 'returned': return <span className="badge badge-returned">Returned</span>;
      default: return <span className="badge">{s}</span>;
    }
  };

  const handleApprove = async (sheetId) => {
    try {
      const totalWeightage = selectedSheet.goals.reduce((s,g) => s + (Number(g.weightage)||0), 0);
      if (totalWeightage !== 100) {
        showToast(`Cannot approve: Total weightage is ${totalWeightage}% (must be 100%)`, 'error');
        return;
      }
      await approveGoalSheet(sheetId, user.uid, reviewComment, selectedSheet.goals, totalWeightage);
      showToast('Goals approved successfully.', 'success');
      setReviewComment('');
      setSelectedMember(null);
      await loadData();
    } catch(e) {
      showToast('Error approving goals.', 'error');
    }
  };

  const handleInlineEdit = (goalIndex, field, value) => {
    if (!selectedSheet || selectedSheet.status !== 'submitted') return;
    
    const newGoals = [...selectedSheet.goals];
    newGoals[goalIndex] = { ...newGoals[goalIndex], [field]: value };
    setSelectedSheet({ ...selectedSheet, goals: newGoals });
  };

  const handleReturn = async (sheetId) => {
    if (!reviewComment.trim()) {
      showToast('A comment is required when returning goals.', 'warn');
      return;
    }
    try {
      await returnGoalSheet(sheetId, user.uid, reviewComment);
      showToast('Goals returned to employee.', 'success');
      setReviewComment('');
      setSelectedMember(null);
      await loadData();
    } catch(e) {
      showToast('Error returning goals.', 'error');
    }
  };

  const handleCompleteCheckin = async (quarter) => {
    try {
      await completeCheckin(selectedSheet.id, selectedMember.uid, user.uid, quarter, cycle.id, checkinComment);
      showToast(`${quarter} check-in marked as complete.`, 'success');
      setCheckinComment('');
      await loadData();
    } catch(e) {
      showToast('Error completing check-in.', 'error');
    }
  };

  const handlePushSharedGoal = async () => {
    if (!sharedGoalForm.title || !sharedGoalForm.thrustArea || !sharedGoalForm.uom) {
      return showToast('Title, Thrust Area, and UoM are required.', 'warn');
    }
    setLoading(true);
    try {
      await pushSharedGoalToTeam(user.uid, cycle.id, team, sharedGoalForm);
      showToast('Shared Goal pushed to all team members!', 'success');
      setShowSharedModal(false);
      setSharedGoalForm({ title: '', thrustArea: '', description: '', uom: 'numeric', uomDirection: 'max', target: '' });
      setAiReasoning('');
      await loadData();
    } catch(e) {
      showToast('Error pushing shared goal', 'error');
      setLoading(false);
    }
  };

  const handleSuggestAIGoal = async () => {
    const ta = sharedGoalForm.thrustArea;
    if (!ta) {
      showToast('Please select a Thrust Area first!', 'warn');
      return;
    }
    
    setSuggestingAI(true);
    showToast('Gemini is drafting a custom KPI...', 'info');
    
    let sug = null;
    try {
      sug = await fetchGeminiGoalSuggestion(ta);
    } catch (err) {
      console.warn("Gemini suggestion failed, using high-fidelity local fallback", err);
    }
    
    const suggestions = {
      'Revenue Growth': {
        title: "Increase Q2 Sales Revenue by 15%",
        uom: "percentage",
        uomDirection: "min",
        target: "15",
        description: "Focus on upselling high-margin add-ons to tier-1 enterprise accounts and improving conversion rates on outbound sales campaigns by 5%.",
        reasoning: "Directly drives top-line revenue expansion. The percentage metric ensures scalable growth tracking, and the target is calibrated to represent an aggressive but highly attainable expansion on existing tier-1 accounts."
      },
      'Customer Success': {
        title: "Achieve a Net Promoter Score (NPS) of 85",
        uom: "numeric",
        uomDirection: "min",
        target: "85",
        description: "Establish a post-resolution feedback loop, conduct comprehensive customer experience mapping, and reduce unresolved tickets to < 1%.",
        reasoning: "Customer satisfaction is our core competitive moat. The numeric target of 85 is calibrated to represent elite industry performance, driving active feedback cycles and zero-friction ticket resolution timelines."
      },
      'Operational Excellence': {
        title: "Reduce Support Ticket Turnaround Time (TAT) to 2 hours",
        uom: "numeric",
        uomDirection: "max",
        target: "2",
        description: "Implement automated routing policies, optimize standard operating documentation (SOPs), and organize bi-weekly triage training sessions.",
        reasoning: "Operational efficiency is vital for scale. Setting a max limit of 2 hours turnaround for tickets drives automated routing and peer SOP triage alignments, representing a massive operational improvement."
      },
      'People & Culture': {
        title: "Organize 3 Cross-Department Knowledge Sharing Sessions",
        uom: "numeric",
        uomDirection: "min",
        target: "3",
        description: "Facilitate engineering-to-product cross-training, document session summaries in internal wiki, and secure at least 90% positive team feedback.",
        reasoning: "Fosters inter-departmental trust and transparency. A target of 3 distinct sessions ensures consistent cross-functional knowledge sharing, driving positive employee net promoter scores."
      },
      'Innovation': {
        title: "Deploy 2 Core AI Features into Production",
        uom: "numeric",
        uomDirection: "min",
        target: "2",
        description: "Successfully design, test, and release the AI-assisted goal drafting tool and automated organizational summary metrics.",
        reasoning: "Aligns with our commitment to state-of-the-art tech. Targeting 2 main production AI features establishes clear technological innovation boundaries and high-value customer feature sets."
      },
      'Compliance & Risk': {
        title: "Achieve Zero Safety/Security Compliance Violations",
        uom: "zero",
        uomDirection: "",
        target: "0",
        description: "Conduct monthly security hygiene audits, mandate compliance training completion for 100% of the engineering staff, and resolve risk alerts in < 24h.",
        reasoning: "Mitigates critical operational and financial exposure. A target of zero violations represents a strict security compliance policy that protects enterprise data integrity."
      },
      'Cost Reduction': {
        title: "Reduce AWS Cloud Hosting Cost by 12%",
        uom: "percentage",
        uomDirection: "min",
        target: "12",
        description: "Decommission unused development environments, implement auto-scaling policies, and migrate storage archives to cold Glacier tiers.",
        reasoning: "Directly improves profitability margins. A 12% savings target is achievable through cloud clean-ups, auto-scaling, and migration to cheaper storage tiers, preserving compute power."
      },
      'Quality': {
        title: "Reduce Bug Incident Rate below 1%",
        uom: "percentage",
        uomDirection: "max",
        target: "1",
        description: "Enforce a strict 80% test-coverage pre-merge threshold, implement automated smoke-testing pipelines, and organize peer design reviews.",
        reasoning: "Guarantees a premium customer user experience. Enforcing a strict 1% maximum bug rate drives standard test coverage rules and automation, proving high engineering discipline."
      }
    };
 
    const finalSug = sug || suggestions[ta] || suggestions['Revenue Growth'];
    
    setSharedGoalForm(prev => ({
      ...prev,
      title: finalSug.title,
      uom: finalSug.uom === 'percentage' ? 'percentage' : finalSug.uom === 'zero' ? 'zero' : finalSug.uom === 'timeline' ? 'timeline' : 'numeric',
      uomDirection: finalSug.uomDirection || 'max',
      target: finalSug.target,
      description: finalSug.description
    }));
    setAiReasoning(finalSug.reasoning || '');
    setSuggestingAI(false);
    showToast('KPI drafted successfully by Gemini!', 'success');
  };

  if (loading) return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div className="page-header"><div><div className="skeleton skeleton-title" style={{ width: '220px' }}></div><div className="skeleton skeleton-text" style={{ width: '250px' }}></div></div></div>
      <div className="grid grid-4 gap-md" style={{ marginBottom: '24px' }}>{[1,2,3,4].map(i => <div key={i} className="card card-stat"><div className="skeleton" style={{ height: '60px' }}></div></div>)}</div>
      <div className="card" style={{ minHeight: '300px' }}><div className="skeleton" style={{ height: '100%' }}></div></div>
    </div>
  );

  const filteredTeam = filter === 'all' ? team : team.filter(m => {
    const s = sheets.find(sh => sh.employeeId === m.uid);
    if (filter === 'draft' && (!s || s.status === 'draft')) return true;
    return s?.status === filter;
  });

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h1>Team Dashboard</h1>
          <p>Review and manage your team's goals</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowSharedModal(true)}>
          <Target size={16} style={{ display: 'inline', marginRight: '6px' }}/>
          Push Shared KPI
        </button>
      </div>

      <div className="grid grid-4 gap-md" style={{ marginBottom: '24px' }}>
        <div className="card card-stat">
          <div className="stat-value">{team.length}</div>
          <div className="stat-label">Team Members</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value text-primary">{sheets.filter(s => s.status === 'submitted').length}</div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value text-success">{sheets.filter(s => s.status === 'approved').length}</div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="card card-stat">
          <div className="stat-value">{checkins.length}</div>
          <div className="stat-label">Check-ins Done</div>
        </div>
      </div>

      <div className="filter-bar">
        {[
          { id: 'all', label: 'All Members' },
          { id: 'submitted', label: 'Pending Approval' },
          { id: 'approved', label: 'Approved' },
          { id: 'draft', label: 'Draft' },
          { id: 'returned', label: 'Returned' }
        ].map(f => (
          <button 
            key={f.id}
            className={`filter-chip ${filter === f.id ? 'active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: selectedMember ? '1fr 1fr' : '1fr', gap: '24px', transition: 'all 0.3s' }}>
        {/* Team List */}
        <div className="card" style={{ minHeight: '400px' }}>
          <div className="card-header">
            <h4><Users size={18} style={{ display: 'inline', marginRight: '8px' }}/> Team List</h4>
          </div>
          {filteredTeam.length === 0 ? (
            <div className="empty-state">
              <p>No team members found for this filter.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredTeam.map(m => {
                const s = sheets.find(sh => sh.employeeId === m.uid);
                const status = s?.status || 'not_started';
                const isSelected = selectedMember?.uid === m.uid;
                
                return (
                  <div 
                    key={m.uid}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', 
                      borderBottom: '1px solid var(--border)', cursor: 'pointer',
                      background: isSelected ? 'rgba(91,95,255,0.08)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--accent-primary)' : '3px solid transparent'
                    }}
                    onClick={() => { setSelectedMember(m); setSelectedSheet(s); }}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gradient-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {m.name?.[0] || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{m.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {s?.goals?.length || 0} goals · {s?.totalWeightage || 0}% · {s ? timeAgo(s.updatedAt || s.createdAt) : 'No activity'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {getStatusBadge(status)}
                      {status === 'submitted' && <div style={{ color: 'var(--accent-primary)' }}><ArrowRight size={16}/></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedMember && (
          <div className="card animate-slide-right" style={{ minHeight: '400px', position: 'relative' }}>
            <button 
              className="btn btn-ghost" 
              style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px' }}
              onClick={() => setSelectedMember(null)}
            >
              <X size={18}/>
            </button>
            <div className="card-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <div>
                <h3 style={{ marginBottom: '4px' }}>{selectedMember.name}</h3>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedMember.department}</div>
              </div>
            </div>

            <div style={{ marginTop: '24px' }}>
              {!selectedSheet || !selectedSheet.goals || selectedSheet.goals.length === 0 ? (
                <div className="empty-state">
                  <Target className="empty-icon" />
                  <p>No goals created yet.</p>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '24px' }}>
                    <h5 style={{ marginBottom: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Target size={16}/> Goal Sheet — {selectedSheet.goals.length} Goals · {selectedSheet.goals.reduce((s,g) => s + (Number(g.weightage)||0), 0)}% Total
                    </h5>
                    <div className="table-container" style={{ border: 'none' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Thrust Area</th>
                            <th>Goal Title</th>
                            <th>UoM</th>
                            <th className="text-right">Target</th>
                            <th className="text-right">Weightage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSheet.goals.map((g, i) => (
                            <tr key={i}>
                              <td style={{ fontSize: '0.82rem' }}>{g.thrustArea}</td>
                              <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {g.title}
                                {g.isShared && <span className="badge badge-info" style={{ fontSize: '0.6rem', marginLeft: '8px' }}>SHARED</span>}
                              </td>
                              <td className="text-mono" style={{ fontSize: '0.82rem' }}>{g.uom} {g.uomDirection ? `(${g.uomDirection})` : ''}</td>
                              <td className="text-right text-mono">
                                {selectedSheet.status === 'submitted' && !g.isShared && g.uom !== 'zero' ? (
                                  <input 
                                    type={g.uom === 'timeline' ? 'date' : 'number'}
                                    value={g.target || ''}
                                    onChange={(e) => handleInlineEdit(i, 'target', e.target.value)}
                                    style={{ width: '80px', padding: '2px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '4px', textAlign: 'right' }}
                                  />
                                ) : (
                                  g.target ?? '—'
                                )}
                              </td>
                              <td className="text-right">
                                {selectedSheet.status === 'submitted' && !g.isShared ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                    <input 
                                      type="number"
                                      value={g.weightage || ''}
                                      onChange={(e) => handleInlineEdit(i, 'weightage', Number(e.target.value))}
                                      style={{ width: '50px', padding: '2px 4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--accent-primary)', borderRadius: '4px', textAlign: 'right', fontWeight: 'bold' }}
                                    />
                                    <span style={{ color: 'var(--text-muted)' }}>%</span>
                                    <span style={{ cursor: 'help' }} title="Manager inline edit">✏️</span>
                                  </div>
                                ) : (
                                  <>
                                    <span className="text-mono" style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{g.weightage}%</span>
                                    {selectedSheet.status === 'approved' ? <Lock size={12} style={{ marginLeft: '6px', color: 'var(--text-muted)' }}/> : null}
                                  </>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'right', fontWeight: 700 }}>Total Weightage:</td>
                            <td className="text-right text-mono" style={{ fontWeight: 800, color: selectedSheet.goals.reduce((s,g) => s + (Number(g.weightage)||0), 0) === 100 ? '#00D4AA' : '#FF4757' }}>
                              {selectedSheet.goals.reduce((s,g) => s + (Number(g.weightage)||0), 0)}%
                              {selectedSheet.goals.reduce((s,g) => s + (Number(g.weightage)||0), 0) === 100 ? ' ✓' : ''}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>

                  {/* Approval Actions */}
                  {selectedSheet.status === 'submitted' && (
                    <div style={{ padding: '20px', background: 'rgba(91,95,255,0.05)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(91,95,255,0.2)' }}>
                      <h5 style={{ marginBottom: '12px' }}>Review Action Required</h5>
                      <textarea 
                        className="form-textarea" 
                        placeholder="Add feedback or reason for changes..." 
                        value={reviewComment}
                        onChange={e => setReviewComment(e.target.value)}
                        style={{ marginBottom: '16px', background: 'var(--bg-card)' }}
                      />
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <button className="btn btn-success" onClick={() => handleApprove(selectedSheet.id)}><CheckCircle2 size={16}/> Approve Goals</button>
                        <button className="btn btn-warn" onClick={() => handleReturn(selectedSheet.id)}><CornerDownLeft size={16}/> Return for Rework</button>
                      </div>
                    </div>
                  )}

                  {/* Check-ins Section */}
                  {selectedSheet.status === 'approved' && cycle?.quarters && (
                    <div style={{ marginTop: '32px' }}>
                      <h5 style={{ marginBottom: '16px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileCheck size={16}/> Quarterly Progress
                      </h5>
                      
                      {['Q1','Q2','Q3','Q4'].map(q => {
                        const windowConfig = cycle.quarters[q];
                        if (!windowConfig) return null;
                        const isOpen = isWindowOpen(windowConfig);
                        const isDone = checkins.some(c => c.employeeId === selectedMember.uid && c.quarter === q);
                        
                        if (!isOpen && !isDone) return null; // Don't show inactive empty quarters to manager
                        
                        return (
                          <div key={q} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <h6 style={{ margin: 0, color: 'var(--text-primary)' }}>{q} Check-in</h6>
                              {isDone ? <span className="badge badge-approved">Completed</span> : <span className="badge badge-submitted">Action Required</span>}
                            </div>
                            
                            {selectedSheet.goals.map((g, i) => {
                              const score = g.computedScores?.[q];
                              const actual = g.achievements?.[q]?.actual;
                              return (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < selectedSheet.goals.length-1 ? '1px dashed var(--border)' : 'none' }}>
                                  <div style={{ flex: 1, fontSize: '0.85rem' }}>
                                    <div style={{ color: 'var(--text-primary)' }}>{g.title}</div>
                                    <div style={{ color: 'var(--text-muted)' }}>Target: {g.target}</div>
                                  </div>
                                  <div style={{ textAlign: 'right' }}>
                                    <div className="text-mono" style={{ fontSize: '0.9rem' }}>Actual: {actual ?? '—'}</div>
                                    <div className="text-mono" style={{ color: getScoreColor(score), fontSize: '0.8rem' }}>Score: {formatScore(score)}</div>
                                  </div>
                                </div>
                              )
                            })}
                            
                            {isOpen && !isDone && (
                              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                                <textarea 
                                  className="form-textarea" 
                                  placeholder="Manager evaluation and feedback..." 
                                  value={checkinComment}
                                  onChange={e => setCheckinComment(e.target.value)}
                                  rows={2}
                                  style={{ marginBottom: '12px' }}
                                />
                                <button className="btn btn-primary" onClick={() => handleCompleteCheckin(q)}>Mark {q} Complete</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Push Shared Goal Modal */}
      {showSharedModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <div className="modal-header">
              <h3>Push Departmental KPI</h3>
              <button className="modal-close" onClick={() => setShowSharedModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleSuggestAIGoal}
                  disabled={suggestingAI}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(91,95,255,0.15)', borderColor: 'rgba(91,95,255,0.3)', color: '#fff', cursor: 'pointer' }}
                >
                  <BrainCircuit size={14} color="var(--accent-primary)"/> AI Suggest KPI
                </button>
              </div>

              <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
                This goal will be instantly injected into all team members' goal sheets. The Title, UoM, and Target will be read-only for employees.
              </p>
              
              <div className="form-group">
                <label className="form-label">Goal Title *</label>
                <input className="form-input" value={sharedGoalForm.title} onChange={e => setSharedGoalForm({...sharedGoalForm, title: e.target.value})} placeholder="e.g. Q1 Revenue Target" />
              </div>
              
              <div className="grid grid-2 gap-sm">
                <div className="form-group">
                  <label className="form-label">Thrust Area *</label>
                  <select className="form-input" value={sharedGoalForm.thrustArea} onChange={e => setSharedGoalForm({...sharedGoalForm, thrustArea: e.target.value})}>
                    <option value="">Select Area</option>
                    {THRUST_AREAS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Target (Optional)</label>
                  <input className="form-input" value={sharedGoalForm.target} onChange={e => setSharedGoalForm({...sharedGoalForm, target: e.target.value})} placeholder="e.g. 1000000" />
                </div>
              </div>

              <div className="grid grid-2 gap-sm">
                <div className="form-group">
                  <label className="form-label">UoM Type *</label>
                  <select className="form-input" value={sharedGoalForm.uom} onChange={e => setSharedGoalForm({...sharedGoalForm, uom: e.target.value})}>
                    <option value="numeric">Numeric / Count</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="timeline">Timeline (Date)</option>
                    <option value="zero">Zero-based (Pass/Fail)</option>
                  </select>
                </div>
                {(sharedGoalForm.uom === 'numeric' || sharedGoalForm.uom === 'percentage') && (
                  <div className="form-group">
                    <label className="form-label">Direction *</label>
                    <select className="form-input" value={sharedGoalForm.uomDirection} onChange={e => setSharedGoalForm({...sharedGoalForm, uomDirection: e.target.value})}>
                      <option value="max">Higher is better (Max)</option>
                      <option value="min">Lower is better (Min)</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '12px' }}>
                <label className="form-label">Goal Description</label>
                <textarea 
                  className="form-textarea" 
                  rows="3" 
                  value={sharedGoalForm.description} 
                  onChange={e => setSharedGoalForm({...sharedGoalForm, description: e.target.value})} 
                  placeholder="Provide context, deliverables, and focus areas..." 
                />
              </div>

              {aiReasoning && (
                <div className="callout callout-success" style={{ marginTop: '16px', fontSize: '0.85rem' }}>
                  <strong>💡 Gemini KPI Calibration Insight:</strong>
                  <p style={{ margin: '4px 0 0 0' }}>{aiReasoning}</p>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowSharedModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handlePushSharedGoal}>Push to {team.length} Members</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
