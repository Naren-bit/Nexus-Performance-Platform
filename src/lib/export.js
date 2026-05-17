import * as XLSX from 'xlsx';
import { formatScore, today, formatDateTime } from './utils.js';

export async function exportAchievementReport(sheets, cycleId) {
  const rows = [];
  
  sheets.forEach(sheet => {
    if (!sheet.goals) return;
    
    sheet.goals.forEach(goal => {
      rows.push({
        'Employee Name': sheet.employeeName || '—',
        'Department': sheet.department || '—',
        'Thrust Area': goal.thrustArea || '—',
        'Goal Title': goal.title || '—',
        'UoM': goal.uom || '—',
        'Target': goal.target ?? '—',
        'Weightage (%)': goal.weightage || 0,
        'Q1 Actual': goal.achievements?.Q1?.actual ?? '',
        'Q2 Actual': goal.achievements?.Q2?.actual ?? '',
        'Q3 Actual': goal.achievements?.Q3?.actual ?? '',
        'Q4 Actual': goal.achievements?.Q4?.actual ?? '',
        'Q1 Score (%)': formatScore(goal.computedScores?.Q1),
        'Q2 Score (%)': formatScore(goal.computedScores?.Q2),
        'Q3 Score (%)': formatScore(goal.computedScores?.Q3),
        'Q4 Score (%)': formatScore(goal.computedScores?.Q4),
        'Status': goal.status || 'not_started'
      });
    });
  });

  if (rows.length === 0) {
    alert("No data to export");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Achievement Report');

  // Basic styling for header
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = { font: { bold: true }, fill: { fgColor: { rgb: '5B5FFF' } } };
  }

  XLSX.writeFile(wb, `Achievement_Report_${cycleId}_${today()}.xlsx`);
}

export async function exportAuditLog(logs) {
  const rows = logs.map(l => ({
    'Timestamp': formatDateTime(l.timestamp),
    'Action': l.action,
    'Target ID': l.targetId,
    'Performed By': l.performedBy,
    'Role': l.performedByRole,
    'Reason': l.reason
  }));

  if (rows.length === 0) {
    alert("No audit logs to export");
    return;
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Audit Log');
  
  XLSX.writeFile(wb, `Audit_Log_${today()}.xlsx`);
}
