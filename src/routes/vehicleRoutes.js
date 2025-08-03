const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const vehicleController = require('../controllers/vehicleController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(), // mantém o arquivo na memória (buffer)
  limits: { fileSize: 10 * 1024 * 1024 } // limite de 10MB (ajuste se quiser)
});

router.post('/entries',
  upload.single('photo'),
  [
    body('plate').notEmpty().withMessage("Placa é obrigatória"),
    body('category').notEmpty().isIn(["carro", "moto"]).withMessage("Categoria fora do formato esperado"),
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntry
);

router.post('/configParking',
  [
    body('maxCars').isInt({ min: 0 }).withMessage('Quantidade de vagas fora do valor esperado'),
    body('maxMotorcycles').isInt({ min: 0 }).withMessage('Quantidade de vagas fora do valor esperado'),
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

router.get('/parked', authMiddleware('NORMAL'), vehicleController.getParkedVehicles);

router.get('/parked-exit', authMiddleware('NORMAL'), vehicleController.getParkedVehiclesExit);

router.get('/check-update', authMiddleware('NORMAL'), vehicleController.checkForUpdates)

router.get('/parking-data', authMiddleware('NORMAL'), vehicleController.parkingOnly)

router.get('/billing-method', authMiddleware('ADMIN'), vehicleController.billingMethod);

router.get('/billing-method-active', authMiddleware('ADMIN'), vehicleController.methodActive)

router.post('/save-payment-config', authMiddleware('ADMIN'), vehicleController.methodSave)

router.post('/calculate-outstanding',
  [
    body("stayDuration")
      .exists()
      .matches(/^\d{2}:\d{2}:\d{2}$/).withMessage("Formato inválido de duração (esperado HH:mm:ss)"),
    body('category').notEmpty().isIn(["carro", "moto"]).withMessage("Categoria fora do formato esperado"),

  ], authMiddleware('NORMAL'),
  vehicleController.calculateOutstanding
)

router.post('/exits',
  upload.single('photo'),
  [
    body("plate").exists().notEmpty(),
    body("exit_time").exists().notEmpty(),
    body("openCashId").exists().notEmpty(),
    body("amount_received").exists().notEmpty(),
    body("change_given").exists().notEmpty(),
    body("discount_amount").exists().notEmpty(),
    body("final_amount").exists().notEmpty(),
    body("original_amount").exists().notEmpty(),
    body("method").exists().notEmpty()
  ],
  authMiddleware('NORMAL'),
  vehicleController.exitsRegister
)

module.exports = router