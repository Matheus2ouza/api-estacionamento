const express = require('express');
const { body, param } = require('express-validator');
const cashController = require('../controllers/cashController')
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/status', authMiddleware('NORMAL'), cashController.statusCash)

router.post('/open-cash',
  [
    body('initialValue').isFloat({min: 0}).withMessage('O valor inicial deve ser um número maior que zero.')
  ],
  authMiddleware('ADMIN'),
  cashController.openCash
)

module.exports = router;