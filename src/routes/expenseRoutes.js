const express = require('express');
const { body, param } = require('express-validator');
const expenseController = require('../controllers/expenseController')
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

//Rotas para as despesas
router.post('/:cashId',
  [
    body("description").exists().notEmpty(),
    body("amount").exists().notEmpty(),
    body("method").exists().notEmpty(),
    param("cashId").exists().notEmpty()
  ],
  authMiddleware('MANAGER'), expenseController.registerOutgoing
);

router.get('/:cashId',
  [
    param('cashId').exists().notEmpty()
  ],
  authMiddleware('MANAGER'), expenseController.listOutgoingExpense
);

router.delete('/:cashId/:expenseId',
  [
    param('cashId').exists().notEmpty(),
    param('expenseId').exists().notEmpty()
  ],
  authMiddleware('MANAGER'), expenseController.deleteOutgoingExpense
);

router.patch('/:cashId/:expenseId',
  [
    param('cashId').exists().notEmpty(),
    param('expenseId').exists().notEmpty(),
    body("description").exists().notEmpty(),
    body("amount").exists().notEmpty(),
    body("method").exists().notEmpty()
  ],
  authMiddleware('MANAGER'), expenseController.updateOutgoingExpense
);

module.exports = router;
