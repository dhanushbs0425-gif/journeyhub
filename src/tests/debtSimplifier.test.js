/**
 * Unit tests for Debt Simplification Algorithm
 */
const assert = require('assert');
const { calculateSettlements } = require('../utils/debtSimplifier');

function testEqualSplitSinglePayer() {
  const alice = { _id: '1', name: 'Alice' };
  const bob = { _id: '2', name: 'Bob' };
  const charlie = { _id: '3', name: 'Charlie' };

  const members = [alice, bob, charlie];
  // Alice paid 90 for dinner, split equally among all 3 ($30 each)
  const expenses = [
    {
      amount: 90,
      paidBy: alice._id,
      splits: [
        { user: alice._id, amount: 30 },
        { user: bob._id, amount: 30 },
        { user: charlie._id, amount: 30 }
      ]
    }
  ];

  const result = calculateSettlements(members, expenses, []);
  assert.strictEqual(result.totalTripExpense, 90);
  assert.strictEqual(result.balances['1'], 60);  // Alice gets back $60
  assert.strictEqual(result.balances['2'], -30); // Bob owes $30
  assert.strictEqual(result.balances['3'], -30); // Charlie owes $30

  assert.strictEqual(result.simplifiedDebts.length, 2);
  // Both Bob and Charlie owe Alice 30
  const bobDebt = result.simplifiedDebts.find(d => d.debtor._id === '2');
  assert.ok(bobDebt);
  assert.strictEqual(bobDebt.creditor._id, '1');
  assert.strictEqual(bobDebt.amount, 30);

  const charlieDebt = result.simplifiedDebts.find(d => d.debtor._id === '3');
  assert.ok(charlieDebt);
  assert.strictEqual(charlieDebt.creditor._id, '1');
  assert.strictEqual(charlieDebt.amount, 30);

  console.log('✔ testEqualSplitSinglePayer passed');
}

function testCircularDebtMinimization() {
  const a = { _id: 'a', name: 'Alice' };
  const b = { _id: 'b', name: 'Bob' };
  const c = { _id: 'c', name: 'Charlie' };
  const members = [a, b, c];

  // A paid $100 for B
  // B paid $100 for C
  // Net: A is owed $100, B is even ($0), C owes $100
  const expenses = [
    {
      amount: 100,
      paidBy: a._id,
      splits: [{ user: b._id, amount: 100 }]
    },
    {
      amount: 100,
      paidBy: b._id,
      splits: [{ user: c._id, amount: 100 }]
    }
  ];

  const result = calculateSettlements(members, expenses, []);
  assert.strictEqual(result.balances['a'], 100);
  assert.strictEqual(result.balances['b'], 0);
  assert.strictEqual(result.balances['c'], -100);

  // Instead of 2 transactions (C pays B, B pays A), should simplify to 1 transaction: C pays A $100!
  assert.strictEqual(result.simplifiedDebts.length, 1);
  assert.strictEqual(result.simplifiedDebts[0].debtor._id, 'c');
  assert.strictEqual(result.simplifiedDebts[0].creditor._id, 'a');
  assert.strictEqual(result.simplifiedDebts[0].amount, 100);

  console.log('✔ testCircularDebtMinimization passed (simplified 2 transactions down to 1)');
}

function testCompletedSettlementReducesBalance() {
  const a = { _id: 'a', name: 'Alice' };
  const b = { _id: 'b', name: 'Bob' };
  const members = [a, b];

  const expenses = [
    {
      amount: 100,
      paidBy: a._id,
      splits: [{ user: b._id, amount: 100 }]
    }
  ];

  // Bob pays Alice $60 towards his debt
  const settlements = [
    {
      payer: b._id,
      payee: a._id,
      amount: 60,
      status: 'confirmed'
    }
  ];

  const result = calculateSettlements(members, expenses, settlements);
  assert.strictEqual(result.balances['a'], 40);
  assert.strictEqual(result.balances['b'], -40);
  assert.strictEqual(result.simplifiedDebts[0].amount, 40);

  console.log('✔ testCompletedSettlementReducesBalance passed');
}

function runAll() {
  console.log('Running Debt Simplifier Unit Tests...');
  testEqualSplitSinglePayer();
  testCircularDebtMinimization();
  testCompletedSettlementReducesBalance();
  console.log('All Debt Simplifier tests passed successfully!\n');
}

if (require.main === module) {
  runAll();
}

module.exports = { runAll };
