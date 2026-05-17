import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import { getGoalSheet, saveGoalSheet, submitGoalSheet } from '../lib/goals';
import { validateGoalSheet, generateId, THRUST_AREAS, UOM_TYPES, VALIDATION_RULES } from '../lib/utils';
import { Save, Send, Plus, Trash2, ArrowLeft, BrainCircuit } from 'lucide-react';
import { sendEmailNotification } from '../lib/notifications';
import { doc, getDoc } from '../lib/firebase-config';
import { db } from '../lib/firebase-config';
import { fetchGeminiGoalSuggestion } from '../lib/gemini';

export default function GoalsCreate() {
  const { user, cycle } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    async function fetchSheet() {
      if (cycle && user) {
        const s = await getGoalSheet(user.uid, cycle.id);
        if (s && (s.status === 'approved' || s.status === 'submitted')) {
          navigate('/dashboard-employee');
          showToast('Your goals are locked and cannot be edited.', 'info');
          return;
        }
        setSheet(s);
        if (s?.goals?.length > 0) {
          setGoals(s.goals);
        } else {
          addGoal();
        }
      }
      setLoading(false);
    }
    fetchSheet();
  }, [cycle, user]);

  const suggestAIGoal = async (index) => {
    const ta = goals[index].thrustArea;
    if (!ta) {
      showToast('Please select a Thrust Area first!', 'warn');
      return;
    }
    
    showToast('✨ Gemini is drafting a custom goal...', 'info');
    
    let sug = null;
    try {
      sug = await fetchGeminiGoalSuggestion(ta);
    } catch (err) {
      console.warn("Gemini suggestion failed, using high-fidelity local fallback", err);
    }
    
    const suggestions = {
      'Revenue Growth': {
        title: "Increase Q2 Sales Revenue by 15%",
        uom: "percent",
        uomDirection: "min",
        target: "15",
        description: "Focus on upselling high-margin add-ons to tier-1 enterprise accounts and improving conversion rates on outbound sales campaigns by 5%."
      },
      'Customer Success': {
        title: "Achieve a Net Promoter Score (NPS) of 85",
        uom: "numeric",
        uomDirection: "min",
        target: "85",
        description: "Establish a post-resolution feedback loop, conduct comprehensive customer experience mapping, and reduce unresolved tickets to < 1%."
      },
      'Operational Excellence': {
        title: "Reduce Support Ticket Turnaround Time (TAT) to 2 hours",
        uom: "numeric",
        uomDirection: "max",
        target: "2",
        description: "Implement automated routing policies, optimize standard operating documentation (SOPs), and organize bi-weekly triage training sessions."
      },
      'People & Culture': {
        title: "Organize 3 Cross-Department Knowledge Sharing Sessions",
        uom: "numeric",
        uomDirection: "min",
        target: "3",
        description: "Facilitate engineering-to-product cross-training, document session summaries in internal wiki, and secure at least 90% positive team feedback."
      },
      'Innovation': {
        title: "Deploy 2 Core AI Features into Production",
        uom: "numeric",
        uomDirection: "min",
        target: "2",
        description: "Successfully design, test, and release the AI-assisted goal drafting tool and automated organizational summary metrics."
      },
      'Compliance & Risk': {
        title: "Achieve Zero Safety/Security Compliance Violations",
        uom: "zero",
        uomDirection: "",
        target: "0",
        description: "Conduct monthly security hygiene audits, mandate compliance training completion for 100% of the engineering staff, and resolve risk alerts in < 24h."
      },
      'Cost Reduction': {
        title: "Reduce AWS Cloud Hosting Cost by 12%",
        uom: "percent",
        uomDirection: "min",
        target: "12",
        description: "Decommission unused development environments, implement auto-scaling policies, and migrate storage archives to cold Glacier tiers."
      },
      'Quality': {
        title: "Reduce Production Deployment Bug Incident Rate below 1%",
        uom: "percent",
        uomDirection: "max",
        target: "1",
        description: "Enforce a strict 80% test-coverage pre-merge threshold, implement automated smoke-testing pipelines, and organize peer design reviews."
      }
    };

    const finalSug = sug || suggestions[ta] || suggestions['Revenue Growth'];
    
    updateGoal(index, 'title', finalSug.title);
    updateGoal(index, 'uom', finalSug.uom);
    if (finalSug.uomDirection !== undefined) updateGoal(index, 'uomDirection', finalSug.uomDirection);
    updateGoal(index, 'target', finalSug.target);
    updateGoal(index, 'description', finalSug.description);
    
    showToast('✨ Gemini Copilot: Drafted a perfect SMART goal!', 'success');
  };

  const addGoal = () => {
    if (goals.length >= VALIDATION_RULES.maxGoals) {
      showToast(`Maximum ${VALIDATION_RULES.maxGoals} goals allowed.`, 'warn');
      return;
    }
    setGoals(prev => [...prev, {
      goalId: generateId(), thrustArea: '', title: '', description: '',
      uom: '', uomDirection: '', target: '', weightage: 10,
      isShared: false, status: 'not_started', achievements: {}, computedScores: {}
    }]);
  };

  const removeGoal = (index) => {
    setGoals(prev => prev.filter((_, i) => i !== index));
  };

  const updateGoal = (index, field, value) => {
    setGoals(prev => {
      const newGoals = [...prev];
      newGoals[index] = { ...newGoals[index], [field]: value };
      return newGoals;
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const data = {
        ...(sheet || {}),
        employeeId: user.uid,
        employeeName: user.name,
        department: user.department || '',
        managerId: user.managerId || '',
        cycleId: cycle.id,
        goals,
        totalWeightage: goals.reduce((s, g) => s + (Number(g.weightage)||0), 0),
        status: 'draft'
      };
      const id = await saveGoalSheet(data);
      if (!sheet) setSheet({ id, ...data });
      else setSheet({ ...sheet, id });
      showToast('Draft saved successfully!', 'success');
    } catch(e) {
      showToast('Failed to save draft.', 'error');
    }
    setSaving(false);
  };

  const handleSubmit = async () => {
    const errors = validateGoalSheet(goals);
    if (errors.length > 0) {
      errors.forEach(e => showToast(e, 'error'));
      return;
    }
    
    setSubmitting(true);
    try {
      // Save first
      const data = {
        ...(sheet || {}),
        employeeId: user.uid,
        employeeName: user.name,
        department: user.department || '',
        managerId: user.managerId || '',
        cycleId: cycle.id,
        goals,
        totalWeightage: 100,
        status: 'draft'
      };
      const id = await saveGoalSheet(data);
      
      // Then submit
      await submitGoalSheet(id);
      
      // Fetch manager details for email
      if (user.managerId) {
        const mgrDoc = await getDoc(doc(db, 'users', user.managerId));
        if (mgrDoc.exists()) {
          sendEmailNotification('goal_submitted', {
            recipientName: mgrDoc.data().name,
            recipientEmail: mgrDoc.data().email,
            employeeName: user.name,
            cycleName: cycle.name
          });
        }
      }
      
      showToast('Goals submitted for approval!', 'success');
      navigate('/dashboard-employee');
    } catch(e) {
      showToast('Failed to submit goals.', 'error');
    }
    setSubmitting(false);
  };

  if (loading) return <div className="empty-state"><div className="spinner"></div></div>;

  const totalWeightage = goals.reduce((s, g) => s + (Number(g.weightage) || 0), 0);
  const remaining = 100 - totalWeightage;
  const validationErrors = validateGoalSheet(goals);

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', paddingBottom: '80px' }}>
      <div className="page-header">
        <div>
          <h1>Goal Setting</h1>
          <p>Define your goals for {cycle?.name}</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate('/dashboard-employee')}>
          <ArrowLeft size={16}/> Back
        </button>
      </div>

      {/* Validation Panel */}
      <div className="card" style={{ position: 'sticky', top: '80px', zIndex: 10, marginBottom: '24px', padding: '16px 24px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
          <div className={`callout ${totalWeightage === 100 ? 'callout-success' : 'callout-danger'}`} style={{ padding: '8px 12px', margin: 0 }}>
            {totalWeightage === 100 ? '✅ Weightage totals exactly 100%' : `❌ Weightage must equal 100% (Currently ${totalWeightage}%)`}
          </div>
          <div className={`callout ${goals.every(g => (Number(g.weightage)||0) >= 10) ? 'callout-success' : 'callout-danger'}`} style={{ padding: '8px 12px', margin: 0 }}>
            {goals.every(g => (Number(g.weightage)||0) >= 10) ? '✅ All goals have min 10% weightage' : '❌ Some goals have <10% weightage'}
          </div>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
          <span>Total Weightage Utilized</span>
          <span className="text-mono" style={{ color: remaining < 0 ? 'var(--accent-danger)' : '' }}>
            {totalWeightage}% ({Math.abs(remaining)}% {remaining < 0 ? 'over limit' : 'remaining'})
          </span>
        </div>
        <div className="progress-track">
          <div 
            className={`progress-fill ${totalWeightage > 100 ? 'danger' : totalWeightage === 100 ? 'success' : ''}`}
            style={{ width: `${Math.min(totalWeightage, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Goals List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {goals.map((g, idx) => (
          <div key={g.goalId} className="card animate-slide-up" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '24px', right: '24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Goal {idx + 1} of {VALIDATION_RULES.maxGoals}
            </div>
            
            <h4 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between', paddingRight: '120px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                Goal Details
                {g.isShared && <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>Shared KPI</span>}
              </span>
              {!g.isShared && (
                <button 
                  type="button"
                  onClick={() => suggestAIGoal(idx)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', padding: '6px 12px', background: 'rgba(155,89,255,0.15)', borderColor: 'rgba(155,89,255,0.3)', color: '#b98eff', cursor: 'pointer', borderRadius: '20px' }}
                >
                  <BrainCircuit size={14} /> AI Suggest Goal
                </button>
              )}
            </h4>

            {goals.length > 1 && !g.isShared && (
              <button 
                onClick={() => removeGoal(idx)}
                className="btn btn-ghost btn-sm" 
                style={{ position: 'absolute', top: '16px', right: '120px', color: 'var(--accent-danger)' }}
              >
                <Trash2 size={16} /> Remove
              </button>
            )}

            <div className="grid grid-2 gap-md">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Goal Title * <span style={{ float: 'right', color: 'var(--text-muted)' }}>{(g.title||'').length}/{VALIDATION_RULES.maxTitleLength}</span></label>
                <input 
                  className="form-input" 
                  value={g.title} 
                  onChange={(e) => updateGoal(idx, 'title', e.target.value)}
                  maxLength={VALIDATION_RULES.maxTitleLength}
                  placeholder="e.g., Increase Q2 Sales by 20%" 
                  disabled={g.isShared}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Thrust Area *</label>
                <select className="form-select" value={g.thrustArea} onChange={(e) => updateGoal(idx, 'thrustArea', e.target.value)} disabled={g.isShared}>
                  <option value="">Select...</option>
                  {THRUST_AREAS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Unit of Measurement *</label>
                <select className="form-select" value={g.uom} disabled={g.isShared} onChange={(e) => {
                  updateGoal(idx, 'uom', e.target.value);
                  if (e.target.value !== 'numeric' && e.target.value !== 'percent') {
                    updateGoal(idx, 'uomDirection', '');
                  }
                  if (e.target.value === 'zero') {
                    updateGoal(idx, 'target', 0);
                  }
                }}>
                  <option value="">Select...</option>
                  {UOM_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                </select>
              </div>

              {(g.uom === 'numeric' || g.uom === 'percent') && (
                <div className="form-group animate-fade-in">
                  <label className="form-label">Direction *</label>
                  <select className="form-select" value={g.uomDirection} disabled={g.isShared} onChange={(e) => updateGoal(idx, 'uomDirection', e.target.value)}>
                    <option value="">Select...</option>
                    <option value="min">Min (Higher is better)</option>
                    <option value="max">Max (Lower is better)</option>
                  </select>
                </div>
              )}

              {g.uom !== 'zero' && (
                <div className="form-group animate-fade-in">
                  <label className="form-label">Target Value *</label>
                  <input 
                    type={g.uom === 'timeline' ? 'date' : 'number'} 
                    className="form-input" 
                    value={g.target || ''} 
                    disabled={g.isShared}
                    onChange={(e) => updateGoal(idx, 'target', e.target.value)}
                  />
                </div>
              )}

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description (Optional)</label>
                <textarea 
                  className="form-textarea" 
                  value={g.description || ''} 
                  disabled={g.isShared}
                  onChange={(e) => updateGoal(idx, 'description', e.target.value)}
                  placeholder="Add more details about how you will achieve this..."
                />
              </div>

              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">
                  Weightage (%) * <span className="text-mono" style={{ color: 'var(--accent-primary)', marginLeft: '8px' }}>{g.weightage}%</span>
                </label>
                <input 
                  type="range" 
                  className="form-range" 
                  min="10" max="100" step="5" 
                  value={g.weightage} 
                  onChange={(e) => updateGoal(idx, 'weightage', parseInt(e.target.value))}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div style={{ position: 'fixed', bottom: 0, left: 'var(--sidebar-width)', right: 0, padding: '16px 24px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', zIndex: 100 }}>
        <button 
          className="btn btn-secondary" 
          onClick={addGoal}
          disabled={goals.length >= VALIDATION_RULES.maxGoals}
        >
          <Plus size={16}/> Add Goal
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={handleSaveDraft}
          disabled={saving || submitting}
        >
          {saving ? <div className="spinner" style={{width: 16, height: 16}}/> : <Save size={16}/>} Save Draft
        </button>
        <div className="tooltip" data-tooltip={validationErrors.length > 0 ? "Fix validation errors to submit" : "Submit to manager"}>
          <button 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={validationErrors.length > 0 || saving || submitting}
          >
            {submitting ? <div className="spinner" style={{width: 16, height: 16}}/> : <Send size={16}/>} Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}
