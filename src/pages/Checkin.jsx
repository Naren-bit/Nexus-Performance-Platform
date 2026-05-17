import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { getGoalSheet } from '../lib/goals';
import { getCheckins, saveAchievement } from '../lib/checkin';
import { isWindowOpen, computeScore, formatScore, getScoreColor } from '../lib/utils';
import { updateDoc, doc, serverTimestamp } from '../lib/firebase-config';
import { db } from '../lib/firebase-config';
import { Save, CheckCircle } from 'lucide-react';

export default function Checkin() {
  const { user, cycle } = useAuth();
  const { showToast } = useToast();
  const [sheet, setSheet] = useState(null);
  const [checkins, setCheckins] = useState([]);
  const [activeQuarter, setActiveQuarter] = useState('Q1');
  const [loading, setLoading] = useState(true);
  const [savingGoalId, setSavingGoalId] = useState(null);

  // Local state for edits
  const [edits, setEdits] = useState({});

  useEffect(() => {
    async function loadData() {
      if (cycle && user) {
        const s = await getGoalSheet(user.uid, cycle.id);
        const c = await getCheckins(user.uid, cycle.id);
        setSheet(s);
        setCheckins(c);
        
        // Find active quarter
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

  if (loading) return <div className="empty-state"><div className="spinner"></div></div>;

  if (!sheet || sheet.status !== 'approved') {
    return (
      <div className="card" style={{ maxWidth: '600px', margin: '40px auto' }}>
        <div className="empty-state">
          <div className="empty-icon" style={{ fontSize: '3rem' }}>🔒</div>
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
    setEdits(prev => ({
      ...prev,
      [`${activeQuarter}_${goalIdx}`]: {
        ...(prev[`${activeQuarter}_${goalIdx}`] || {}),
        [field]: value
      }
    }));
  };

  const getEditValue = (goalIdx, field, defaultValue) => {
    const editObj = edits[`${activeQuarter}_${goalIdx}`];
    if (editObj && editObj[field] !== undefined) return editObj[field];
    return defaultValue;
  };

  const saveGoalProgress = async (goalIdx) => {
    const goal = sheet.goals[goalIdx];
    const editObj = edits[`${activeQuarter}_${goalIdx}`] || {};
    
    // Fallbacks to existing data if no edit
    const actual = editObj.actual !== undefined ? editObj.actual : (goal.achievements?.[activeQuarter]?.actual ?? '');
    const comment = editObj.comment !== undefined ? editObj.comment : (goal.achievements?.[activeQuarter]?.comment ?? '');
    
    if (actual === '' && goal.uom !== 'zero') {
      showToast('Please enter an actual value.', 'warn');
      return;
    }

    setSavingGoalId(goalIdx);
    try {
      const val = goal.uom === 'timeline' ? actual : Number(actual);
      await saveAchievement(sheet.id, goalIdx, activeQuarter, val, comment);
      
      // Update local state to reflect score immediately
      const newScore = computeScore(goal, val);
      const updatedSheet = { ...sheet };
      updatedSheet.goals[goalIdx].achievements = updatedSheet.goals[goalIdx].achievements || {};
      updatedSheet.goals[goalIdx].achievements[activeQuarter] = { actual: val, comment };
      updatedSheet.goals[goalIdx].computedScores = updatedSheet.goals[goalIdx].computedScores || {};
      updatedSheet.goals[goalIdx].computedScores[activeQuarter] = newScore;
      setSheet(updatedSheet);

      showToast('Progress saved!', 'success');
    } catch(e) {
      showToast('Failed to save progress.', 'error');
    }
    setSavingGoalId(null);
  };

  const setGoalStatus = async (goalIdx, status) => {
    try {
      const updatedGoals = [...sheet.goals];
      updatedGoals[goalIdx].status = status;
      await updateDoc(doc(db, 'goalSheets', sheet.id), { goals: updatedGoals, updatedAt: serverTimestamp() });
      setSheet({ ...sheet, goals: updatedGoals });
      showToast(`Status updated to ${status.replace('_', ' ')}`, 'success');
    } catch(e) {
      showToast('Failed to update status.', 'error');
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '40px' }}>
      <div className="page-header">
        <div>
          <h1>Quarterly Check-ins</h1>
          <p>Track your goal progress each quarter</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        {['Q1','Q2','Q3','Q4'].map(q => {
          const done = checkins.some(c => c.quarter === q);
          return (
            <button 
              key={q}
              className={`btn ${q === activeQuarter ? 'btn-primary' : 'btn-secondary'}`}
              style={{ borderRadius: 'var(--radius-full)' }}
              onClick={() => setActiveQuarter(q)}
            >
              {q} {done && <CheckCircle size={14} style={{ marginLeft: '4px', color: q === activeQuarter ? '#fff' : 'var(--accent-secondary)' }}/>}
            </button>
          );
        })}
      </div>

      <div className={`callout ${isOpen ? 'callout-success' : 'callout-warn'}`} style={{ marginBottom: '24px' }}>
        {isOpen 
          ? `✅ ${activeQuarter} check-in window is open. Update your progress below.` 
          : `🔒 ${activeQuarter} check-in window is closed.${windowConfig ? ` Opens: ${windowConfig.open}` : ''}`
        }
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {sheet.goals.map((g, i) => {
          const actual = getEditValue(i, 'actual', g.achievements?.[activeQuarter]?.actual ?? '');
          const comment = getEditValue(i, 'comment', g.achievements?.[activeQuarter]?.comment ?? '');
          
          // Live compute score if they are editing, else use saved
          let currentScore = g.computedScores?.[activeQuarter];
          if (edits[`${activeQuarter}_${i}`]?.actual !== undefined) {
            const valForScore = g.uom === 'timeline' ? actual : Number(actual);
            currentScore = computeScore(g, valForScore);
          }

          const scoreColor = getScoreColor(currentScore);
          const inputType = g.uom === 'timeline' ? 'date' : 'number';

          return (
            <div key={g.goalId} className="card animate-slide-up" style={{ animationDelay: `${i*80}ms`, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '4px', color: 'var(--text-primary)' }}>{g.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {g.thrustArea} · {g.uom} {g.uomDirection ? `(${g.uomDirection})` : ''} · Target: <span className="text-mono">{g.target}</span> · Weight: <span className="text-mono">{g.weightage}%</span>
                  </div>
                </div>
                {formatScore(currentScore) !== '—' && (
                  <div className="badge" style={{ background: `${scoreColor}22`, color: scoreColor, fontSize: '1rem', padding: '6px 12px' }}>
                    {formatScore(currentScore)}
                  </div>
                )}
              </div>

              <div className="grid grid-3 gap-md" style={{ alignItems: 'end', marginBottom: isOpen ? '16px' : '0' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{activeQuarter} Actual Value</label>
                  <input 
                    type={inputType} 
                    className="form-input" 
                    value={actual}
                    onChange={(e) => handleEditChange(i, 'actual', e.target.value)}
                    disabled={!isOpen || isDone}
                    placeholder={g.uom === 'zero' ? "Enter 0 if achieved" : "Enter actual..."}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Comment / Notes</label>
                  <input 
                    className="form-input" 
                    value={comment}
                    onChange={(e) => handleEditChange(i, 'comment', e.target.value)}
                    disabled={!isOpen || isDone}
                    placeholder="Optional details..."
                  />
                </div>
                {isOpen && !isDone && (
                  <button 
                    className="btn btn-secondary" 
                    style={{ height: '44px' }}
                    onClick={() => saveGoalProgress(i)}
                    disabled={savingGoalId === i}
                  >
                    {savingGoalId === i ? <div className="spinner" style={{width: 16, height:16}}/> : <Save size={16}/>} Save
                  </button>
                )}
              </div>

              {isOpen && !isDone && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status:</span>
                  {['not_started', 'on_track', 'completed'].map(st => (
                    <button 
                      key={st}
                      className="btn btn-ghost btn-sm"
                      style={{ 
                        background: g.status === st ? 'rgba(91,95,255,0.1)' : 'transparent',
                        borderColor: g.status === st ? 'var(--accent-primary)' : 'transparent',
                        color: g.status === st ? 'var(--accent-primary)' : 'var(--text-secondary)'
                      }}
                      onClick={() => setGoalStatus(i, st)}
                    >
                      {st.replace('_', ' ')}
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
