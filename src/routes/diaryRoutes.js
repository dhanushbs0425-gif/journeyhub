const express = require('express');
const router = express.Router({ mergeParams: true });
const diaryController = require('../controllers/diaryController');
const { protect } = require('../middleware/auth');
const { requireTripMember } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', diaryController.getDiaryEntries);
router.post('/', diaryController.createDiaryEntry);
router.put('/:entryId', diaryController.updateDiaryEntry);
router.delete('/:entryId', diaryController.deleteDiaryEntry);

module.exports = router;
