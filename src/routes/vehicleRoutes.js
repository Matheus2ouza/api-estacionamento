const express = require('express');
const { body } = require('express-validator');
const vehicleController = require('../controllers/vehicleController');

const router = express.Router();

router.post(
  '/entries',
  [
    body('plate').notEmpty().withMessage("Placa é obrigatória")
  ],
  vehicleController.vehicleEntry
);

module.exports = router