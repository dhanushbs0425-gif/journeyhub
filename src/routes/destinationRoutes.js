const express = require('express');
const router = express.Router();
const destinationController = require('../controllers/destinationController');

router.get('/', destinationController.getDestinations);
router.get('/categories', destinationController.getCategories);
router.get('/states', destinationController.getStates);
router.get('/random', destinationController.getRandomDestination);
router.get('/:id/nearby', destinationController.getNearbyDestinations);
router.get('/:id', destinationController.getDestinationById);

module.exports = router;
