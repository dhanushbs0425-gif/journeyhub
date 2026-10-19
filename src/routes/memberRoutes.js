const express = require('express');
const router = express.Router({ mergeParams: true });
const memberController = require('../controllers/memberController');
const { protect } = require('../middleware/auth');
const { requireTripMember, requireTripOwner } = require('../middleware/tripAuth');

router.use(protect);
router.use(requireTripMember);

router.get('/', memberController.getMembers);
router.post('/', memberController.inviteMember);
router.put('/:memberId/role', requireTripOwner, memberController.updateMemberRole);
router.delete('/:memberId', memberController.removeMember);

module.exports = router;
