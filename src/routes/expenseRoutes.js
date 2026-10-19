const express = require('express');
const router = express.Router({ mergeParams: true });
const expenseController = require('../controllers/expenseController');
const { protect } = require('../middleware/auth');
const { requireTripMember, requireTripEditor } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', expenseController.getExpenses);
router.post('/', requireTripEditor, expenseController.addExpense);
router.put('/:expenseId', requireTripEditor, expenseController.updateExpense);
router.delete('/:expenseId', requireTripEditor, expenseController.deleteExpense);

module.exports = router;
