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

//Rota de registro de entrada de veículo
router.post('/entries',
  upload.single('photo'),
  [
    body('plate').notEmpty().withMessage("Placa é obrigatória"),
    body('category').notEmpty().isIn(["carro", "moto"]).withMessage("Categoria fora do formato esperado"),
    body('observation').optional(),
    body('billingMethod').optional(),
    body('cashRegisterId').notEmpty().withMessage("Caixa é obrigatória"),
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntry
);

//Rota de listagem de entradas de veículo
router.get('/entries/:cashId',
  [
    param('cashId').exists().notEmpty(),
  ],
  authMiddleware('NORMAL'),
  vehicleController.listVehicleEntries
);

//Rota de busca de foto de entrada de veículo
router.get('/:vehicleId/photo',
  [
    param('vehicleId').exists().notEmpty(),
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntryPhoto
);

//Rota de busca de segunda via de entrada de veículo
router.get('/entries/:vehicleId/duplicate',
  [
    param('vehicleId').exists().notEmpty(),
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntryDuplicate
)

//Rota para desativar uma entrada de veículo
router.patch('/entries/:vehicleId/deactivate',
  [
    param('vehicleId').exists().notEmpty(),
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntryDesactivate
);

//Rota para ativar uma entrada de veículo
router.patch('/entries/:vehicleId/activate',
  [
    param('vehicleId').exists().notEmpty(),
  ],
  authMiddleware('MANAGER'),
  vehicleController.vehicleEntryActivate
);

//Rota para atualizar uma entrada de veículo
router.put('/entries/:vehicleId',
  [
    param('vehicleId').exists().notEmpty(),
    body('plate').notEmpty().withMessage("Placa é obrigatória"),
    body('category').notEmpty().isIn(["carro", "moto"]).withMessage("Categoria fora do formato esperado"),
    body('observation').optional(),
    body('requiredTicket').toBoolean().isBoolean().withMessage("Ticket é obrigatório"),
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntryUpdate
);

//Rota para atualizar a foto de uma entrada de veículo
router.put('/entries/:vehicleId/photo',
  upload.single('photo'),
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntryUpdatePhoto
);

//Rota para deletar a foto de uma entrada de veículo
router.delete('/entries/:vehicleId/photo',
  [
    param('vehicleId').exists().notEmpty(),
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleEntryDeletePhoto
);

router.get('/entries/:vehicleId/:plateId',
  [
    param('vehicleId').exists().notEmpty(),
    param('plateId').exists().notEmpty(),
  ],
  authMiddleware('NORMAL'),
  vehicleController.fetchVehicleEntry
)

//Rota de cálculo de dívida de veículo
router.post('/exit/:vehicleId/:plateId/calculate',
  [
    param('vehicleId').exists().notEmpty(),
    param('plateId').exists().notEmpty(),

  ], authMiddleware('NORMAL'),
  vehicleController.calculateOutstanding
)

router.post('/exit/:cashId/:vehicleId/confirm',
  upload.single('photo'),
  [
    param('cashId').exists().notEmpty(),
    param('vehicleId').exists().notEmpty(),
    body('amountReceived').exists().notEmpty(), // valor recebido
    body('changeGiven').exists().notEmpty(), // troco
    body('discountAmount').exists().notEmpty(), // desconto
    body('finalAmount').exists().notEmpty(), // valor final
    body('originalAmount').exists().notEmpty(), // valor original
    body('method').exists().notEmpty() // método de pagamento
  ],
  authMiddleware('NORMAL'),
  vehicleController.exitsRegisterConfirm
);

router.get('/exit/:transactionId/duplicate',
  [
    param('transactionId').exists().notEmpty(),
  ],
  authMiddleware('NORMAL'),
  vehicleController.vehicleExitDuplicate
)

module.exports = router
