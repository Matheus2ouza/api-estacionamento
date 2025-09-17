const express = require('express');
const { body, param, query } = require('express-validator');
const cashController = require('../controllers/cashController')
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

//Rotas do caixa
//Rota do status
router.get('/status', authMiddleware('NORMAL'), cashController.statusCash)

//Rotas para abrir o caixa
router.post('/open',
  [
    body('initialValue').isFloat({ min: 0 }).withMessage('O valor inicial deve ser um número maior que zero.')
  ],
  authMiddleware('MANAGER'),
  cashController.openCash
);

//Rotas para fechar o caixa
router.post('/:cashId/close',
  [
    param('cashId').isUUID(),
  ],
  authMiddleware('NORMAL'), cashController.closeCash
);

//Rotas para reabrir o caixa
router.post('/:cashId/reopen',
  [
    param("cashId").exists().notEmpty()
  ],
  authMiddleware('MANAGER'),
  cashController.reopenCash
);

router.put('/:cashId',
  [
    param('cashId').isUUID(),
    body('initialValue').isFloat({ min: 0 }).withMessage('O valor inicial deve ser um número maior que zero.'),
  ],
  authMiddleware('NORMAL'), cashController.updateCash
);

//Rotas para pegar os dados do caixa
router.get('/:cashId/data',
  [
    param('cashId').exists().isString()
  ],
  authMiddleware('MANAGER'), cashController.cashData
);

router.get('/:cashId/general',
  [
    param('cashId').exists().isString()
  ],
  authMiddleware('MANAGER'), cashController.generalCashData
);

router.get('/:cashId/history',
  [
    param('cashId').exists().notEmpty()
  ],
  authMiddleware('MANAGER'), cashController.cashHistory
);

router.delete('/:cashId/:transactionId',
  [
    param('cashId').exists().notEmpty(),
    param('transactionId').exists().notEmpty(),
    query('type').exists().notEmpty().isIn(["vehicle", "product", "expense"]),
    query('permanent').optional().isBoolean()
  ],
  authMiddleware('MANAGER'), cashController.deleteTransaction
);

router.get('/history',
  [
    query('cursor').optional().isString().withMessage('O cursor deve ser uma string'),
    query('limit').optional().isInt().withMessage('O limite deve ser um número inteiro'),
  ],
  authMiddleware('NORMAL'), cashController.generalCashHistory
);

router.get('/history/:transactionId/photo',
  [
    param('transactionId').exists().notEmpty(),
    query('type').exists().notEmpty().isIn(["vehicle", "product"]),
  ],
  authMiddleware('NORMAL'), cashController.transactionPhoto
);

//Rotas de metodos de cobrança
//Rotas para criar um metodo de cobrança
router.post('/billing-method',
  [
    body('title').notEmpty().withMessage('O título é obrigatório'),
    body('tolerance').isInt().withMessage('A tolerância é obrigatória'),
    body('category').notEmpty().isIn(["POR_HORA", "POR_MINUTO", "VALOR_FIXO"]).withMessage('A categoria é obrigatória'),
    body('time').optional(),
    body('carroValue').notEmpty().withMessage('O valor do carro é obrigatório'),
    body('motoValue').notEmpty().withMessage('O valor da moto é obrigatório'),
  ],
  authMiddleware('MANAGER'),
  cashController.billingMethodSave
);

//Rotas para pegar a lista de metodos de cobrança
router.get('/billing-method', authMiddleware('NORMAL'), cashController.billingMethodList);

//Rotas para deletar um metodo de cobrança
router.delete('/billing-method/:id', authMiddleware('MANAGER'), cashController.billingMethodDelete);

//Rotas para atualizar um metodo de cobrança
router.patch('/billing-method/:id', authMiddleware('MANAGER'), cashController.billingMethodUpdate);

//Rotas para atualizar um metodo de cobrança
router.put('/billing-method/:id',
  [
    body('title').notEmpty().withMessage('O título é obrigatório'),
    body('category').notEmpty().isIn(["POR_HORA", "POR_MINUTO", "VALOR_FIXO"]).withMessage('A categoria é obrigatória'),
    body('tolerance').isInt().withMessage('A tolerância é obrigatória'),
    body('time').optional().custom((value, { req }) => {
      // Se a categoria for VALOR_FIXO, aceita qualquer valor (será convertido para 0)
      if (req.body.category === 'VALOR_FIXO') {
        return true;
      }

      // Para outras categorias, valida o formato
      if (!value) return false;

      // Validação simples usando Date para verificar se é um horário válido
      const testDate = new Date(`2000-01-01T${value}`);
      if (isNaN(testDate.getTime())) {
        throw new Error('O tempo deve estar no formato hh:mm:ss');
      }

      // Verifica se os valores estão dentro dos limites aceitáveis
      const [hours, minutes, seconds] = value.split(':').map(Number);
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
        throw new Error('Horário inválido');
      }

      return true;
    }).withMessage('O tempo deve estar no formato hh:mm:ss'),
    body('carroValue').notEmpty().withMessage('O valor do carro é obrigatório'),
    body('motoValue').notEmpty().withMessage('O valor da moto é obrigatório'),
  ],
  authMiddleware('MANAGER'),
  cashController.billingMethodPut
);

module.exports = router;
