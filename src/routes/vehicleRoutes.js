const express = require('express');
const { body } = require('express-validator');
const vehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post(
  '/entries',
  [
    body('plate').notEmpty().withMessage("Placa é obrigatória"),
    body('category').notEmpty().isIn(["carro", "moto", "carroGrande"]).withMessage("Categoria fora do formato esperado"),
    body('operatorUsername').notEmpty().withMessage("O operador é obrigatorio")
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntry
);

router.get('/configParking', authMiddleware('NORMAL'), vehicleController.getParkingConfig)

router.post(
  '/configParking',
  [
    body('maxCars').isInt({min: 0}).withMessage('Quantidade de vagas fora do valor esperado'),
    body('maxMotorcycles').isInt({min: 0}).withMessage('Quantidade de vagas fora do valor esperado'),
    body('maxLargeVehicles').isInt({min: 0}).withMessage('Quantidade de vagas fora do valor esperado'),
  ],
  authMiddleware('ADMIN'),
  vehicleController.ConfigurationParking
)

router.get('/parked',authMiddleware('NORMAL'), vehicleController.getParkedVehicles);

router.get('/check-update',authMiddleware('NORMAL'), vehicleController.checkForUpdates)

module.exports = router