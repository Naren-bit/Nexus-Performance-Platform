// ============================================
// NEXUS PORTAL — Shared Utilities (React)
// ============================================

// ---------- Date Utilities ----------
export function formatDate(date) {
  if (!date) return '—';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(date) {
  if (!date) return '—';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(date) {
  if (!date) return '—';
  const d = date.toDate ? date.toDate() : new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function daysSince(timestamp) {
  if (!timestamp) return 0;
  const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function daysSinceOpen(dateStr) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

export function isWindowOpen(windowConfig) {
  if (!windowConfig) return false;
  const now = new Date();
  return now >= new Date(windowConfig.open) && now <= new Date(windowConfig.close);
}

export function today() {
  return new Date().toISOString().split('T')[0];
}

// ---------- Score Computation ----------
export function computeScore(goal, actual) {
  if (actual === null || actual === undefined || actual === '') return null;
  actual = Number(actual);

  switch (goal.uom) {
    case 'numeric':
    case 'percent':
      if (goal.uomDirection === 'max') {
        return goal.target === 0 ? (actual === 0 ? 1.0 : 0) : goal.target / actual;
      }
      return goal.target === 0 ? (actual === 0 ? 1.0 : 0) : actual / goal.target;

    case 'timeline': {
      const deadline = new Date(goal.target);
      const completion = new Date(actual);
      if (completion <= deadline) return 1.0;
      return Math.max(0, 1 - ((completion - deadline) / (1000 * 60 * 60 * 24 * 30)));
    }

    case 'zero':
      return actual === 0 ? 1.0 : 0.0;

    default:
      return null;
  }
}

export function formatScore(score) {
  if (score === null || score === undefined) return '—';
  return `${Math.round(score * 100)}%`;
}

export function getScoreColor(score) {
  if (score === null || score === undefined) return 'var(--text-muted)';
  const pct = score * 100;
  if (pct >= 90) return 'var(--accent-secondary)';
  if (pct >= 70) return 'var(--accent-warn)';
  return 'var(--accent-danger)';
}

// ---------- Validation Rules ----------
export const VALIDATION_RULES = {
  maxGoals: 8,
  minWeightage: 10,
  totalWeightage: 100,
  maxTitleLength: 120
};

export function validateGoalSheet(goals) {
  const errors = [];
  if (!goals || goals.length === 0)
    errors.push('At least one goal is required.');
  if (goals.length > VALIDATION_RULES.maxGoals)
    errors.push(`Maximum ${VALIDATION_RULES.maxGoals} goals allowed.`);

  const total = goals.reduce((sum, g) => sum + (Number(g.weightage) || 0), 0);
  if (total !== 100)
    errors.push(`Total weightage must equal 100%. Current: ${total}%`);

  goals.forEach((g, i) => {
    if ((Number(g.weightage) || 0) < VALIDATION_RULES.minWeightage)
      errors.push(`Goal ${i + 1}: Minimum weightage is ${VALIDATION_RULES.minWeightage}%.`);
    if (!g.title || g.title.trim().length === 0)
      errors.push(`Goal ${i + 1}: Title is required.`);
    if (g.title && g.title.length > VALIDATION_RULES.maxTitleLength)
      errors.push(`Goal ${i + 1}: Title exceeds ${VALIDATION_RULES.maxTitleLength} characters.`);
    if (!g.thrustArea)
      errors.push(`Goal ${i + 1}: Thrust Area is required.`);
    if (!g.uom)
      errors.push(`Goal ${i + 1}: Unit of Measurement is required.`);
    if ((g.uom === 'numeric' || g.uom === 'percent') && !g.uomDirection)
      errors.push(`Goal ${i + 1}: Direction is required for ${g.uom} UoM.`);
    if (g.uom !== 'zero' && (g.target === null || g.target === undefined || g.target === ''))
      errors.push(`Goal ${i + 1}: Target value is required.`);
  });

  return errors;
}

// ---------- Thrust Areas ----------
export const THRUST_AREAS = [
  'Revenue Growth',
  'Customer Success',
  'Operational Excellence',
  'People & Culture',
  'Innovation',
  'Compliance & Risk',
  'Cost Reduction',
  'Quality'
];

// ---------- UoM Types ----------
export const UOM_TYPES = [
  { value: 'numeric', label: 'Numeric' },
  { value: 'percent', label: 'Percentage (%)' },
  { value: 'timeline', label: 'Timeline' },
  { value: 'zero', label: 'Zero-based' }
];

// ---------- Generate Unique ID ----------
export function generateId() {
  return 'g' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

// ---------- Current Quarter ----------
export function getCurrentQuarter() {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}

// ---------- Debounce ----------
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
