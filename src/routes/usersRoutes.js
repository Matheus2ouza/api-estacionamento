const express = require('express');
const { body, param } = require('express-validator');
const authController = require('../controllers/usersController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post(
  '/create',
  [
    body('username').isLength({ min: 2, max: 50 }).withMessage('O nome deve ter entre 2 e 50 caracteres'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
    body('role').isIn(['ADMIN', 'MANAGER', 'NORMAL']).withMessage('Valor inesperado no role'),
    body('passwordAdmin').optional(),
  ],
  authMiddleware('ADMIN'),
  authController.register
);

router.post(
  '/',
  [
    body('username').notEmpty().withMessage('Username é obrigatório'),
    body('password').notEmpty().withMessage('Senha é obrigatória'),
    body('expoPushToken').optional().isString().withMessage('Expo Push Token deve ser uma string'),
  ],
  authController.login
);

router.put(
  '/update',
  [
    body('id').notEmpty().withMessage('id é obrigatório'),
    body('username').notEmpty().withMessage('nome de usuario obrigatório'),
    body('role').isIn(['ADMIN', 'MANAGER', 'NORMAL']).withMessage('Valor inesperado no role'),
    body('password').optional().isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
    body('passwordAdmin').optional(),
  ],
  authMiddleware('ADMIN'),
  authController.updateUsers
);

router.delete(
  '/delete/:id',
  [
    param('id').isUUID().withMessage('id é obrigatório'),
    body('password').notEmpty().withMessage('senha é obrigatório')
  ],
  authMiddleware('ADMIN'),
  authController.deleteUser
)

router.get('/', authMiddleware('ADMIN'), authController.listUsers);

module.exports = router;
