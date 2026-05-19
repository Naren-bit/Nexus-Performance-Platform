import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { getGoalSheet, getTeamMembers, getTeamGoalSheets } from '../lib/goals';
import { getCheckins, saveAchievement, completeCheckin } from '../lib/checkin';
import { isWindowOpen, computeScore, formatScore, getScoreColor } from '../lib/utils';
import { updateDoc, doc, serverTimestamp, getDocs, collection, query, where } from '../lib/firebase-config';
import { db } from '../lib/firebase-config';
import { Save, CheckCircle, Lock, Target, TrendingUp, Clock, AlertTriangle, Users, ChevronRight, MessageSquare } from 'lucide-react';

export default function Checkin() {
  const { user, cycle } = useAuth();
  const { showToast } = useToast();
  const [sheet, setSheet] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [activeQuarter, setActiveQuarter] = useState('Q1');
  const [loading, setLoading] = useState(true);
  const [savingGoalId, setSavingGoalId] = useState(null);
  const [edits, setEdits] = useState({});

  // Manager specific states
  const [team, setTeam] = useState([]);
  const [teamSheets, setTeamSheets] = useState([]);
  const [teamCheckins, setTeamCheckins] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [checkinComment, setCheckinComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (cycle && user) {
        if (user.role === 'manager') {
          // Fetch team members
          const members = await getTeamMembers(user.uid);
          setTeam(members);

          // Fetch team goal sheets
          const sheetsData = await getTeamGoalSheets(user.uid, cycle.id);
          setTeamSheets(sheetsData);

          // Fetch all checkins for the cycle under this manager
          const q = query(
            collection(db, 'checkins'),
            where('managerId', '==', user.uid),
            where('cycleId', '==', cycle.id)
          );
          const snap = await getDocs(q);
          const cData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTeamCheckins(cData);

          // Auto-select first member if exists
          if (members.length > 0) {
            setSelectedMember(members[0]);
            const matchSheet = sheetsData.find(s => s.employeeId === members[0].uid);
            setSelectedSheet(matchSheet || null);
          }
        } else {
          const s = await getGoalSheet(user.uid, cycle.id);
          const c = await getCheckins(user.uid, cycle.id);
          setSheet(s);
          setCheckins(c);
        }

        for (const q of ['Q1','Q2','Q3','Q4']) {
          if (cycle?.quarters?.[q] && isWindowOpen(cycle.quarters[q])) {
            setActiveQuarter(q);
            break;
          }
        }
      }
      setLoading(false);
    }
    loadData();
  }, [cycle, user]);

  const handleManagerCheckinSubmit = async (quarter) => {
    if (!selectedSheet || !selectedMember) return;
    setSubmittingComment(true);
    try {
      await completeCheckin(selectedSheet.id, selectedMember.uid, user.uid, quarter, cycle.id, checkinComment);
      showToast(`${quarter} check-in successfully reviewed and completed!`, 'success');
      setCheckinComment('');
      
      // Refresh checkins data
      const qQuery = query(
        collection(db, 'checkins'),
        where('managerId', '==', user.uid),
        where('cycleId', '==', cycle.id)
      );
      const snap = await getDocs(qQuery);
      const cData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeamCheckins(cData);
    } catch(e) {
      showToast('Failed to complete check-in.', 'error');
    }
    setSubmittingComment(false);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
        <div className="page-header"><div><h1>Quarterly Check-ins</h1><p>Loading...</p></div></div>
        {[1,2,3].map(i => <div key={i} className="card" style={{ height: '120px', marginBottom: '16px' }}><div className="skeleton" style={{ height: '100%' }}></div></div>)}
      </div>
    );
  }

  if (user?.role === 'manager') {
    return (
      <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
        <div className="page-header">
          <div>
            <h1>Manager Check-in Module</h1>
            <p>View Planned vs. Achievement data and log structured comments for your direct reports</p>
          </div>
        </div>

        <div className="grid grid-3" style={{ gap: '24px', alignItems: 'start' }}>
          {/* Team Members List */}
          <div className="card" style={{ gridColumn: 'span 1', padding: '16px' }}>
            <h4 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--accent-primary)"/> Team Members
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {team.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: '20px 0' }}>No team members found.</p>
              ) : (
                team.map(m => {
                  const active = selectedMember?.uid === m.uid;
                  const empSheet = teamSheets.find(s => s.employeeId === m.uid);
                  const isSheetApproved = empSheet?.status === 'approved';
                  return (
                    <div
                      key={m.uid}
                      onClick={() => {
                        setSelectedMember(m);
                        setSelectedSheet(empSheet || null);
                        setCheckinComment('');
                      }}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '12px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                        background: active ? 'rgba(91,95,255,0.08)' : 'transparent',
                        border: active ? '1px solid var(--accent-primary)' : '1px solid var(--border)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: active ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{m.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{m.department}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isSheetApproved ? (
                          <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Approved</span>
                        ) : (
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>No Goals</span>
                        )}
                        <ChevronRight size={16} style={{ opacity: active ? 1 : 0.3 }}/>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Member Details & Goal Achievement View */}
          <div className="card" style={{ gridColumn: 'span 2', minHeight: '400px' }}>
            {selectedMember ? (
              <>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '24px' }}>
                  <h3 style={{ margin: 0 }}>{selectedMember.name}</h3>
                  <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>{selectedMember.department} · Direct Report</p>
                </div>

                {!selectedSheet || !selectedSheet.goals || selectedSheet.goals.length === 0 ? (
                  <div className="empty-state">
                    <Lock size={48} style={{ color: 'var(--accent-primary)', opacity: 0.5, marginBottom: '16px' }}/>
                    <h3>Goals Not Approved / Started</h3>
                    <p>{selectedMember.name} has not submitted their goals, or they are not approved yet.</p>
                  </div>
                ) : (
                  <div>
                    {/* Quarters Selection */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                      {['Q1', 'Q2', 'Q3', 'Q4'].map(q => {
                        const qOpen = cycle?.quarters?.[q] && isWindowOpen(cycle.quarters[q]);
                        const isDone = teamCheckins.some(c => c.employeeId === selectedMember.uid && c.quarter === q);
                        const isSelected = activeQuarter === q;
                        return (
                          <button
                            key={q}
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => {
                              setActiveQuarter(q);
                              setCheckinComment('');
                            }}
                            style={{ flex: 1, borderRadius: 'var(--radius-full)' }}
                          >
                            {q} {isDone && <CheckCircle size={14} style={{ marginLeft: '4px' }}/>}
                          </button>
                        );
                      })}
                    </div>

                    {/* Window Warning */}
                    {!(cycle?.quarters?.[activeQuarter] && isWindowOpen(cycle.quarters[activeQuarter])) && (
                      <div className="callout callout-warn" style={{ marginBottom: '24px' }}>
                        <Lock size={16}/> <span>{activeQuarter} check-in window is currently <strong>closed</strong>.</span>
                      </div>
                    )}

                    {/* Goal Progress View */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                      {selectedSheet.goals.map((g, i) => {
                        const achievement = g.achievements?.[activeQuarter];
                        const actual = achievement?.actual;
                        const comment = achievement?.comment;
                        const score = g.computedScores?.[activeQuarter];
                        const scoreColor = getScoreColor(score);

                        return (
                          <div key={g.goalId} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                              <div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{g.title}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                  Target: <span className="text-mono" style={{ color: 'var(--text-secondary)' }}>{g.target}</span> · 
                                  Weightage: <span className="text-mono" style={{ color: 'var(--text-secondary)' }}>{g.weightage}%</span> · 
                                  UoM: <span style={{ color: 'var(--text-secondary)' }}>{g.uom}</span>
                                </div>
                              </div>
                              {score != null && (
                                <div className="badge" style={{ background: `${scoreColor}15`, color: scoreColor, height: 'fit-content' }}>
                                  Score: {formatScore(score)}
                                </div>
                              )}
                            </div>

                            <div className="grid grid-2 gap-sm" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Planned vs Achievement</span>
                                <div className="text-mono" style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginTop: '2px' }}>
                                  Target: {g.target} | Actual: <span style={{ color: 'var(--accent-primary)' }}>{actual ?? '—'}</span>
                                </div>
                              </div>
                              <div>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Employee Notes</span>
                                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {comment || 'No notes added.'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Structured Manager Evaluation Form */}
                    {teamCheckins.some(c => c.employeeId === selectedMember.uid && c.quarter === activeQuarter) ? (
                      <div className="callout callout-success" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div><strong>✅ Check-in Evaluation Complete</strong></div>
                        <p style={{ fontSize: '0.85rem', margin: 0 }}>
                          Manager Feedback logged: "{teamCheckins.find(c => c.employeeId === selectedMember.uid && c.quarter === activeQuarter)?.managerComment || 'No comments logged.'}"
                        </p>
                      </div>
                    ) : (
                      cycle?.quarters?.[activeQuarter] && isWindowOpen(cycle.quarters[activeQuarter]) ? (
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                          <h5 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MessageSquare size={16} color="var(--accent-primary)"/> Add Structured Evaluation Comment
                          </h5>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                            Document your performance discussion and log feedback. This comment will be logged into the audit log and check-in register.
                          </p>
                          <textarea
                            className="form-textarea"
                            rows={3}
                            placeholder="Type performance review feedback for this quarter..."
                            value={checkinComment}
                            onChange={e => setCheckinComment(e.target.value)}
                            style={{ marginBottom: '16px' }}
                          />
                          <button
                            className="btn btn-primary"
                            onClick={() => handleManagerCheckinSubmit(activeQuarter)}
                            disabled={submittingComment || !checkinComment.trim()}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                          >
                            {submittingComment ? 'Logging...' : 'Mark Quarter Check-in Complete'}
                          </button>
                        </div>
                      ) : (
                        <div className="callout callout-warn">
                          <span>Check-in comments can only be submitted while the {activeQuarter} window is open.</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="empty-state">
                <Users size={48} style={{ color: 'var(--accent-primary)', opacity: 0.5, marginBottom: '16px' }}/>
                <h3>Select a Team Member</h3>
                <p>Select a direct report from the left sidebar to view their planned vs. actual check-ins.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!sheet || sheet.status !== 'approved') {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
        <div className="empty-state">
          <Lock size={48} style={{ color: 'var(--accent-primary)', opacity: 0.5, marginBottom: '16px' }}/>
          <h3>Goals Not Approved</h3>
          <p>Your goals must be approved by your manager before you can track progress.</p>
        </div>
      </div>
    );
  }

  const windowConfig = cycle?.quarters?.[activeQuarter];
  const isOpen = windowConfig && isWindowOpen(windowConfig);
  const isDone = checkins.some(c => c.quarter === activeQuarter);

  const handleEditChange = (goalIdx, field, value) => {
    setEdits(prev => ({ ...prev, [`${activeQuarter}_${goalIdx}`]: { ...(prev[`${activeQuarter}_${goalIdx}`] || {}), [field]: value } }));
  };

  const getEditValue = (goalIdx, field, defaultValue) => {
    const editObj = edits[`${activeQuarter}_${goalIdx}`];
    if (editObj && editObj[field] !== undefined) return editObj[field];
    return defaultValue;
  };

  const saveGoalProgress = async (goalIdx) => {
    const goal = sheet.goals[goalIdx];
    const editObj = edits[`${activeQuarter}_${goalIdx}`] || {};
    const actual = editObj.actual !== undefined ? editObj.actual : (goal.achievements?.[activeQuarter]?.actual ?? '');
    const comment = editObj.comment !== undefined ? editObj.comment : (goal.achievements?.[activeQuarter]?.comment ?? '');
    if (actual === '' && goal.uom !== 'zero') { showToast('Please enter an actual value.', 'warn'); return; }
    setSavingGoalId(goalIdx);
    try {
      const val = goal.uom === 'timeline' ? actual : Number(actual);
      await saveAchievement(sheet.id, goalIdx, activeQuarter, val, comment);
      const newScore = computeScore(goal, val);
      const updatedSheet = { ...sheet };
      updatedSheet.goals[goalIdx].achievements = updatedSheet.goals[goalIdx].achievements || {};
      updatedSheet.goals[goalIdx].achievements[activeQuarter] = { actual: val, comment };
      updatedSheet.goals[goalIdx].computedScores = updatedSheet.goals[goalIdx].computedScores || {};
      updatedSheet.goals[goalIdx].computedScores[activeQuarter] = newScore;
      setSheet(updatedSheet);
      showToast('Progress saved!', 'success');
    } catch(e) { showToast('Failed to save progress.', 'error'); }
    setSavingGoalId(null);
  };

  const setGoalStatus = async (goalIdx, status) => {
    try {
      const updatedGoals = [...sheet.goals];
      updatedGoals[goalIdx].status = status;
      await updateDoc(doc(db, 'goalSheets', sheet.id), { goals: updatedGoals, updatedAt: serverTimestamp() });
      setSheet({ ...sheet, goals: updatedGoals });
      showToast(`Status updated to ${status.replace('_', ' ')}`, 'success');
    } catch(e) { showToast('Failed to update status.', 'error'); }
  };

  // Formula display helper
  const getFormulaText = (goal, actual) => {
    if (actual === '' || actual === undefined || actual === null) return null;
    const numActual = Number(actual);
    const numTarget = Number(goal.target);
    
    switch (goal.uom) {
      case 'numeric':
      case 'percent':
        if (goal.uomDirection === 'max') {
          const raw = numActual === 0 ? '∞' : (numTarget / numActual).toFixed(2);
          const capped = Math.min(1, numActual === 0 ? 1 : numTarget / numActual);
          return `Target ÷ Actual = ${numTarget} ÷ ${numActual} = ${raw} → ${Math.round(capped * 100)}%${capped >= 1 ? ' (capped ✓)' : ''}`;
        }
        const raw = numTarget === 0 ? '∞' : (numActual / numTarget).toFixed(2);
        const capped = Math.min(1, numTarget === 0 ? 1 : numActual / numTarget);
        return `Actual ÷ Target = ${numActual} ÷ ${numTarget} = ${raw} → ${Math.round(capped * 100)}%${capped >= 1 ? ' (capped ✓)' : ''}`;
      case 'timeline':
        return `Completion vs Deadline comparison`;
      case 'zero':
        return `Zero-based: Actual = ${numActual} → ${numActual === 0 ? '100% ✓' : '0%'}`;
      default:
        return null;
    }
  };

  const statusIcons = { not_started: <Clock size={14}/>, on_track: <TrendingUp size={14}/>, completed: <CheckCircle size={14}/> };
  const statusColors = { not_started: 'var(--text-muted)', on_track: '#FFA502', completed: '#00D4AA' };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h1>Quarterly Check-ins</h1>
          <p>Track your goal progress each quarter</p>
        </div>
      </div>

      {/* Quarter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['Q1','Q2','Q3','Q4'].map(q => {
          const done = checkins.some(c => c.quarter === q);
          const qOpen = cycle?.quarters?.[q] && isWindowOpen(cycle.quarters[q]);
          return (
            <button 
              key={q}
              className={`btn ${q === activeQuarter ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)', position: 'relative' }}
              onClick={() => setActiveQuarter(q)}
            >
              {q} {done && <CheckCircle size={14} style={{ marginLeft: '4px', color: q === activeQuarter ? '#fff' : 'var(--accent-secondary)' }}/>}
              {qOpen && !done && <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', borderRadius: '50%', background: '#00D4AA', animation: 'pulse-green 2s infinite' }}></span>}
            </button>
          );
        })}
      </div>

      {/* Window Status Banner */}
      <div className={`callout ${isOpen ? 'callout-success' : 'callout-warn'}`} style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isOpen ? <CheckCircle size={18} color="#00D4AA"/> : <Lock size={18} color="#FFA502"/>}
        {isOpen 
          ? <span>{activeQuarter} check-in window is <strong>open</strong>. Update your progress below.</span>
          : <span>{activeQuarter} check-in window is <strong>closed</strong>.{windowConfig ? ` Opens: ${windowConfig.open}` : ''}</span>
        }
      </div>

      {/* Goal Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sheet.goals.map((g, i) => {
          const actual = getEditValue(i, 'actual', g.achievements?.[activeQuarter]?.actual ?? '');
          const comment = getEditValue(i, 'comment', g.achievements?.[activeQuarter]?.comment ?? '');
          
          let currentScore = g.computedScores?.[activeQuarter];
          if (edits[`${activeQuarter}_${i}`]?.actual !== undefined) {
            const valForScore = g.uom === 'timeline' ? actual : Number(actual);
            currentScore = computeScore(g, valForScore);
          }

          const scoreColor = getScoreColor(currentScore);
          const scorePct = currentScore != null ? Math.min(100, Math.round(currentScore * 100)) : 0;
          const inputType = g.uom === 'timeline' ? 'date' : 'number';
          const formulaText = getFormulaText(g, actual);
          const goalStatus = g.status || 'not_started';

          return (
            <div key={g.goalId} className="card animate-slide-up" style={{ animationDelay: `${i*80}ms`, padding: '24px' }}>
              {/* Goal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Target size={16} color="#5B5FFF"/>
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{g.title}</span>
                    {g.isShared && <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>SHARED</span>}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>Target: <span className="text-mono" style={{ color: 'var(--text-secondary)' }}>{g.target}</span></span>
                    <span>Weightage: <span className="text-mono" style={{ color: 'var(--text-secondary)' }}>{g.weightage}%</span></span>
                    <span>UoM: <span style={{ color: 'var(--text-secondary)' }}>{g.uom} {g.uomDirection ? `(${g.uomDirection === 'min' ? 'higher is better' : 'lower is better'})` : ''}</span></span>
                  </div>
                </div>
                {formatScore(currentScore) !== '—' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div className="badge" style={{ background: `${scoreColor}22`, color: scoreColor, fontSize: '1.1rem', padding: '8px 16px', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                      {formatScore(currentScore)}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: scoreColor, fontWeight: 600 }}>
                      {scorePct >= 90 ? 'Excellent' : scorePct >= 70 ? 'On Track' : 'Needs Attention'}
                    </span>
                  </div>
                )}
              </div>

              {/* Progress Bar */}
              {currentScore != null && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Progress Score</span>
                    <span className="text-mono" style={{ fontSize: '0.78rem', color: scoreColor }}>{scorePct}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${scorePct}%`, height: '100%', borderRadius: '4px',
                      background: scorePct >= 90 ? 'linear-gradient(90deg, #00D4AA, #00B894)' : scorePct >= 70 ? 'linear-gradient(90deg, #FFA502, #FECA57)' : 'linear-gradient(90deg, #FF4757, #FF6B81)',
                      boxShadow: `0 0 12px ${scoreColor}40`,
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}></div>
                  </div>
                </div>
              )}

              {/* Input Fields */}
              <div className="grid grid-3 gap-md" style={{ alignItems: 'end', marginBottom: '8px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{activeQuarter} Actual Value</label>
                  <input 
                    type={inputType} className="form-input" value={actual}
                    onChange={(e) => handleEditChange(i, 'actual', e.target.value)}
                    disabled={!isOpen || isDone}
                    placeholder={g.uom === 'zero' ? "Enter 0 if achieved" : "Enter actual..."}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Comment / Notes</label>
                  <input 
                    className="form-input" value={comment}
                    onChange={(e) => handleEditChange(i, 'comment', e.target.value)}
                    disabled={!isOpen || isDone}
                    placeholder="Optional details..."
                  />
                </div>
                {isOpen && !isDone && (
                  <button className="btn btn-primary" style={{ height: '44px' }} onClick={() => saveGoalProgress(i)} disabled={savingGoalId === i}>
                    {savingGoalId === i ? <div className="spinner" style={{width: 16, height:16, borderColor: '#fff', borderTopColor: 'transparent'}}/> : <Save size={16}/>} Save
                  </button>
                )}
              </div>

              {/* Formula Display */}
              {formulaText && (
                <div style={{ 
                  fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--text-muted)', 
                  padding: '8px 12px', background: 'rgba(91,95,255,0.05)', borderRadius: '6px', 
                  border: '1px solid rgba(91,95,255,0.1)', marginBottom: '8px'
                }}>
                  Formula: {formulaText}
                </div>
              )}

              {/* Status Selector */}
              {isOpen && !isDone && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '4px' }}>Status:</span>
                  {['not_started', 'on_track', 'completed'].map(st => (
                    <button 
                      key={st} className="btn btn-ghost btn-sm"
                      style={{ 
                        background: goalStatus === st ? `${statusColors[st]}15` : 'transparent',
                        borderColor: goalStatus === st ? statusColors[st] : 'transparent',
                        color: goalStatus === st ? statusColors[st] : 'var(--text-secondary)',
                        display: 'flex', alignItems: 'center', gap: '6px'
                      }}
                      onClick={() => setGoalStatus(i, st)}
                    >
                      {statusIcons[st]} {st.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
