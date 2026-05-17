import { db, collection, addDoc, serverTimestamp, writeBatch, doc } from './firebase-config.js';
import { daysSinceOpen, daysSince, isWindowOpen } from './utils.js';

export const ESCALATION_RULES = [
  {
    id: 'goal_not_submitted',
    check: (user, cycle, sheet) => !sheet && daysSinceOpen(cycle.goalSettingOpen) > 7,
    level1Days: 7,
    level2Days: 14,
    level3Days: 21,
    message: (name) => `${name} has not submitted their goals.`
  },
  {
    id: 'goal_not_approved',
    check: (user, cycle, sheet) => sheet?.status === 'submitted' && daysSince(sheet.submittedAt) > 5,
    level1Days: 5,
    level2Days: 10,
    level3Days: 15,
    message: (name) => `Goal sheet submitted by ${name} is awaiting approval.`
  },
  {
    id: 'checkin_not_done',
    check: (user, cycle, checkins, quarter) => {
      if (!cycle.quarters?.[quarter]) return false;
      return isWindowOpen(cycle.quarters[quarter]) && !checkins.find(c => c.quarter === quarter && c.employeeId === user.uid);
    },
    level1Days: 5,
    level2Days: 12,
    level3Days: 18,
    message: (name, q) => `${name} has not completed their ${q} check-in.`
  }
];

export async function runEscalationCheck(cycle, users, sheets, checkins) {
  const escalations = [];
  
  users.filter(u => u.role === 'employee').forEach(user => {
    const sheet = sheets.find(s => s.employeeId === user.uid);
    const userCheckins = checkins.filter(c => c.employeeId === user.uid);

    // Rule 1: Goal not submitted
    if (ESCALATION_RULES[0].check(user, cycle, sheet)) {
      const days = daysSinceOpen(cycle.goalSettingOpen);
      const level = days >= ESCALATION_RULES[0].level3Days ? 3 : days >= ESCALATION_RULES[0].level2Days ? 2 : 1;
      escalations.push({
        type: 'goal_not_submitted',
        targetUserId: user.uid,
        targetUserName: user.name,
        targetManagerId: user.managerId,
        cycleId: cycle.cycleId || cycle.id,
        daysSinceOpen: days,
        level,
        notificationsSent: level >= 2 ? ['employee', 'manager'] : ['employee'],
        message: ESCALATION_RULES[0].message(user.name),
        resolved: false
      });
    }

    // Rule 2: Goal not approved
    if (ESCALATION_RULES[1].check(user, cycle, sheet)) {
      const days = daysSince(sheet.submittedAt);
      const level = days >= ESCALATION_RULES[1].level3Days ? 3 : days >= ESCALATION_RULES[1].level2Days ? 2 : 1;
      escalations.push({
        type: 'goal_not_approved',
        targetUserId: user.uid,
        targetUserName: user.name,
        targetManagerId: user.managerId,
        cycleId: cycle.cycleId || cycle.id,
        daysSinceOpen: days,
        level,
        notificationsSent: level >= 2 ? ['manager', 'admin'] : ['manager'],
        message: ESCALATION_RULES[1].message(user.name),
        resolved: false
      });
    }

    // Rule 3: Checkin not done (check all quarters)
    ['Q1', 'Q2', 'Q3', 'Q4'].forEach(q => {
      if (ESCALATION_RULES[2].check(user, cycle, userCheckins, q)) {
        const days = daysSinceOpen(cycle.quarters[q].open);
        const level = days >= ESCALATION_RULES[2].level3Days ? 3 : days >= ESCALATION_RULES[2].level2Days ? 2 : 1;
        escalations.push({
          type: `checkin_not_done_${q}`,
          targetUserId: user.uid,
          targetUserName: user.name,
          targetManagerId: user.managerId,
          cycleId: cycle.cycleId || cycle.id,
          daysSinceOpen: days,
          level,
          notificationsSent: level >= 2 ? ['employee', 'manager'] : ['employee'],
          message: ESCALATION_RULES[2].message(user.name, q),
          resolved: false
        });
      }
    });
  });

  return escalations;
}

export async function saveEscalations(escalations) {
  try {
    const batch = writeBatch(db);
    escalations.forEach(esc => {
      const ref = doc(collection(db, 'escalations'));
      batch.set(ref, { ...esc, createdAt: serverTimestamp() });
    });
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error saving escalations:', error);
    throw error;
  }
}
