const express = require('express');
const { body, param } = require('express-validator');
const cashController = require('../controllers/cashController')
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/status', authMiddleware('NORMAL'), cashController.statusCash)

router.post('/open-cash',
  [
    body('initialValue').isFloat({ min: 0 }).withMessage('O valor inicial deve ser um número maior que zero.')
  ],
  authMiddleware('ADMIN'),
  cashController.openCash
);

router.get('/general-cash-data/:id',
  [
    param('id').isUUID(),
  ],
  authMiddleware('ADMIN'), cashController.geralCashData
);

router.post('/close-cash/:id',
  [
    param('id').isUUID(),
    body('finalValue').isFloat({min: 0})
  ],
  authMiddleware('NORMAL'), cashController.closeCash
)

router.get('/billing-method', authMiddleware('NORMAL'), cashController.BillingMethod)

router.get('/cash-data/:id',
  [
    param('id').exists().isString()
  ],
  authMiddleware('ADMIN'), cashController.cashData
)

router.get('/outgoing-expense/:id',
  [
    param("id").exists().notEmpty()
  ],
  authMiddleware('NORMAL'),
  cashController.OutgoingExpense
)

router.post('/outgoing-expense-register',
  [
    body("description").exists().notEmpty(),
    body("amount").exists().notEmpty(),
    body("method").exists().notEmpty(),
    body("openCashId").exists().notEmpty()
  ],
  authMiddleware('NORMAL'),
  cashController.registerOutgoing
)

module.exports = router;