const express = require('express');
const { body, param } = require('express-validator');
const parkingController = require('../controllers/parkingController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/config', authMiddleware('NORMAL'), parkingController.parkingConfig);

router.post('/config',
  [
    body('maxCars').notEmpty().withMessage('A quantidade de vagas de carros é obrigatória'),
    body('maxMotorcycles').notEmpty().withMessage('A quantidade de vagas de motos é obrigatória'),
  ],
  authMiddleware('MANAGER'),
  parkingController.parkingConfigSave
);

router.get('/capacity/:cashId',
  [
    param('cashId').notEmpty().withMessage('O ID da caixa é obrigatório'),
  ],
  authMiddleware('NORMAL'),
  parkingController.capacityParking
);

module.exports = router;
