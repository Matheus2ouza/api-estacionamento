const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post(
  '/register',
  [ 
    body('username').isLength({ min: 2, max: 50 }).withMessage('O nome deve ter entre 2 e 50 caracteres'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username é obrigatório'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
  ],
  authController.login
);


router.get('/listUsers', authMiddleware('ADMIN'), authController.listUsers);
module.exports = router;
