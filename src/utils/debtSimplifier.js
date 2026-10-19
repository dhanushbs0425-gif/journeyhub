/**
 * JourneyHub Debt Simplifier Utility
 * Implements net balance calculation and greedy transaction minimization
 * to resolve 'who owes whom' with the minimum number of settlements (<= N-1).
 */

function roundToTwo(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculate net balances and minimal settlement transactions
 * @param {Array} members - Array of user objects [{ _id, name, email, avatar }]
 * @param {Array} expenses - Array of expense objects
 * @param {Array} settlements - Array of completed settlements
 * @returns {Object} { balances: Object, simplifiedDebts: Array, totalExpense: Number }
 */
function calculateSettlements(members = [], expenses = [], settlements = []) {
  const memberMap = new Map();
  const balances = {}; // userId -> net balance (positive = owed money, negative = owes money)
  const totalPaidByMember = {};
  const totalShareByMember = {};

  members.forEach(m => {
    const id = m._id ? m._id.toString() : m.toString();
    memberMap.set(id, m);
    balances[id] = 0;
    totalPaidByMember[id] = 0;
    totalShareByMember[id] = 0;
  });

  let totalTripExpense = 0;

  // 1. Process all expenses
  expenses.forEach(expense => {
    const amount = Number(expense.amount) || 0;
    totalTripExpense += amount;
    const payerId = (expense.paidBy?._id || expense.paidBy)?.toString();

    if (payerId && balances[payerId] !== undefined) {
      balances[payerId] += amount;
      totalPaidByMember[payerId] = (totalPaidByMember[payerId] || 0) + amount;
    }

    // Process splits
    if (Array.isArray(expense.splits) && expense.splits.length > 0) {
      expense.splits.forEach(split => {
        const splitUserId = (split.user?._id || split.user)?.toString();
        const splitAmount = Number(split.amount) || 0;
        if (splitUserId && balances[splitUserId] !== undefined) {
          balances[splitUserId] -= splitAmount;
          totalShareByMember[splitUserId] = (totalShareByMember[splitUserId] || 0) + splitAmount;
        }
      });
    } else {
      // Default to equal split across all registered members
      const activeMemberIds = Array.from(memberMap.keys());
      if (activeMemberIds.length > 0) {
        const equalShare = amount / activeMemberIds.length;
        activeMemberIds.forEach(id => {
          balances[id] -= equalShare;
          totalShareByMember[id] = (totalShareByMember[id] || 0) + equalShare;
        });
      }
    }
  });

  // 2. Factor in completed settlements
  settlements.forEach(settlement => {
    if (settlement.status === 'confirmed' || !settlement.status) {
      const payerId = (settlement.payer?._id || settlement.payer)?.toString(); // Person who sent money
      const payeeId = (settlement.payee?._id || settlement.payee)?.toString(); // Person who received money
      const amount = Number(settlement.amount) || 0;

      if (payerId && balances[payerId] !== undefined) {
        // Payer paid debt, so their negative balance is relieved (+amount)
        balances[payerId] += amount;
      }
      if (payeeId && balances[payeeId] !== undefined) {
        // Payee received their owed money, so their positive credit reduces (-amount)
        balances[payeeId] -= amount;
      }
    }
  });

  // Round balances to 2 decimal places to prevent floating point drift
  const creditors = []; // { userId, amount: positive }
  const debtors = [];   // { userId, amount: positive amount owed }
  const balanceBreakdown = [];

  Object.keys(balances).forEach(userId => {
    const net = roundToTwo(balances[userId]);
    balances[userId] = net;

    const userObj = memberMap.get(userId) || { _id: userId, name: 'Traveler' };

    balanceBreakdown.push({
      user: userObj,
      paid: roundToTwo(totalPaidByMember[userId] || 0),
      share: roundToTwo(totalShareByMember[userId] || 0),
      netBalance: net,
      status: net > 0.01 ? 'gets_back' : net < -0.01 ? 'owes' : 'settled'
    });

    if (net > 0.01) {
      creditors.push({ userId, user: userObj, amount: net });
    } else if (net < -0.01) {
      debtors.push({ userId, user: userObj, amount: -net });
    }
  });

  // Sort creditors descending, debtors descending (greedy heuristic)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // 3. Greedy Debt Simplification
  const simplifiedDebts = [];
  let cIdx = 0;
  let dIdx = 0;

  while (cIdx < creditors.length && dIdx < debtors.length) {
    const creditor = creditors[cIdx];
    const debtor = debtors[dIdx];

    const settledAmount = Math.min(creditor.amount, debtor.amount);
    const roundedSettled = roundToTwo(settledAmount);

    if (roundedSettled > 0.01) {
      simplifiedDebts.push({
        debtor: debtor.user,
        creditor: creditor.user,
        amount: roundedSettled
      });
    }

    creditor.amount = roundToTwo(creditor.amount - settledAmount);
    debtor.amount = roundToTwo(debtor.amount - settledAmount);

    if (creditor.amount <= 0.01) cIdx++;
    if (debtor.amount <= 0.01) dIdx++;
  }

  return {
    totalTripExpense: roundToTwo(totalTripExpense),
    balances,
    balanceBreakdown,
    simplifiedDebts
  };
}

module.exports = {
  calculateSettlements,
  roundToTwo
};
