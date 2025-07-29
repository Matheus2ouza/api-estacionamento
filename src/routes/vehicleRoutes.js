const express = require('express');
const { body, param } = require('express-validator');
const vehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/entries',
  [
    body('plate').notEmpty().withMessage("Placa é obrigatória"),
    body('category').notEmpty().isIn(["carro", "moto"]).withMessage("Categoria fora do formato esperado"),
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntry
);

router.post('/configParking',
  [
    body('maxCars').isInt({min: 0}).withMessage('Quantidade de vagas fora do valor esperado'),
    body('maxMotorcycles').isInt({min: 0}).withMessage('Quantidade de vagas fora do valor esperado'),
  ],
  authMiddleware('ADMIN'),
  vehicleController.ConfigurationParking
)

router.post('/editVehicle', 
  [
    body('id').notEmpty().withMessage('O id é obrigatorio'),
    body('category').notEmpty().withMessage('A categoria é obrigatoria'),
    body('plate').notEmpty().withMessage('A placa é obrigatoria')
  ],
  authMiddleware('NORMAL'),
  vehicleController.editVehicle
)

router.post('/deleteVehicle', 
  [
    body('id').notEmpty().withMessage('O id é obrigatorio'),
  ],
  authMiddleware('NORMAL'),
  vehicleController.deleteVehicle
)

router.post('/reactivate-vehicle',
  [
    body("id").exists().notEmpty(),
    body("plate").exists().notEmpty()
  ],
  authMiddleware('ADMIN'),
  vehicleController.reactivateVehicle
)

router.get('/:id/ticket',
  [
    param('id').isUUID(),
  ],
  authMiddleware('NORMAL'), 
  vehicleController.generateTicketDuplicate
);

router.get('/:id/:plate/vehicle',
  [
    param('id').isUUID(),
    param('plate').isLength({ min: 7, max: 7 }),
  ],
  authMiddleware('NORMAL'),
  vehicleController.getUniqueVehicle
)

router.get('/configParking', authMiddleware('NORMAL'), vehicleController.getParkingConfig)

router.get('/parked',authMiddleware('NORMAL'), vehicleController.getParkedVehicles);

router.get('/check-update',authMiddleware('NORMAL'), vehicleController.checkForUpdates)

router.get('/parking-data', authMiddleware('NORMAL'), vehicleController.parkingOnly)

module.exports = router