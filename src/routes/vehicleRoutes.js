const express = require('express');
const { body } = require('express-validator');
const vehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post(
  '/entries',
  [
    body('plate').notEmpty().withMessage("Placa é obrigatória")
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntry
);

router.get('/parked',authMiddleware('NORMAL'), vehicleController.getParkedVehicles);

router.get('/check-update',authMiddleware('NORMAL'), vehicleController.checkForUpdates)

module.exports = router