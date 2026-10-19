const express = require('express');
const router = express.Router({ mergeParams: true });
const voteController = require('../controllers/voteController');
const { protect } = require('../middleware/auth');
const { requireTripMember } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', voteController.getVotes);
router.post('/', voteController.createVote);
router.post('/:voteId/cast', voteController.castVote);
router.put('/:voteId/status', voteController.togglePollStatus);

module.exports = router;
