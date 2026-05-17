import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { getGoalSheet } from '../lib/goals';
import { getCheckins, saveAchievement } from '../lib/checkin';
import { isWindowOpen, computeScore, formatScore, getScoreColor } from '../lib/utils';
import { updateDoc, doc, serverTimestamp } from '../lib/firebase-config';
import { db } from '../lib/firebase-config';
import { Save, CheckCircle, Lock, Target, TrendingUp, Clock, AlertTriangle } from 'lucide-react';

export default function Checkin() {
  const { user, cycle } = useAuth();
  const { showToast } = useToast();
  const [sheet, setSheet] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [activeQuarter, setActiveQuarter] = useState('Q1');
  const [loading, setLoading] = useState(true);
  const [savingGoalId, setSavingGoalId] = useState(null);
  const [edits, setEdits] = useState({});

  useEffect(() => {
    async function loadData() {
      if (cycle && user) {
        const s = await getGoalSheet(user.uid, cycle.id);
        const c = await getCheckins(user.uid, cycle.id);
        setSheet(s);
        setCheckins(c);
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

  if (loading) {
    return (
      <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
        <div className="page-header"><div><h1>Quarterly Check-ins</h1><p>Loading...</p></div></div>
        {[1,2,3].map(i => <div key={i} className="card" style={{ height: '120px', marginBottom: '16px' }}><div className="skeleton" style={{ height: '100%' }}></div></div>)}
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
