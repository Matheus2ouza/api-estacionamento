const express = require('express');
const { body, param, query } = require('express-validator');
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');
const ProductController = require('../controllers/productController')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(), // mantém o arquivo na memória (buffer)
  limits: { fileSize: 10 * 1024 * 1024 } // limite de 10MB (ajuste se quiser)
});

// Rota para listar produtos
router.get('/list', authMiddleware('NORMAL'), ProductController.listProducts);

// Rota para buscar produto por código de barras
router.get('/lookup',
  [
    query('barcode')
      .notEmpty()
      .withMessage('O código de barras é obrigatório')
  ],
  authMiddleware('NORMAL'),
  ProductController.fetchProductByBarcode
);

// Rota para criar um novo produto
router.post("/create",
  [
    body("productName")
      .notEmpty()
      .withMessage("O nome do produto é obrigatório"),
    body("barcode")
      .optional(),
    body("unitPrice")
      .notEmpty()
      .withMessage("O preço unitário é obrigatório"),
    body("quantity")
      .notEmpty()
      .withMessage("A quantidade é obrigatória"),
    body("expirationDate")
      .notEmpty()
      .withMessage("A data de validade é obrigatória"),
  ],
  authMiddleware("NORMAL"),
  ProductController.createProduct
);

// Rota para atualizar um produto
router.put('/:productId/update',
  [
    param('productId').notEmpty().withMessage('O id do produto é obrigatório'),
    body('productName').notEmpty().withMessage('O nome do produto é obrigatório'),
    body('barcode').optional(),
    body('unitPrice').notEmpty().withMessage('O preço unitário é obrigatório'),
    body('quantity').notEmpty().withMessage('A quantidade é obrigatória'),
    body('expirationDate').notEmpty().withMessage('A data de validade é obrigatória'),
    body('isActive').optional()
  ],
  authMiddleware('NORMAL'),
  ProductController.updateProduct
);

// Rota para deletar um produto
router.patch('/:productId',
  [
    param('productId').notEmpty().withMessage('O id do produto é obrigatório'),
    query('mode').notEmpty().withMessage('O modo deve ser um booleano'),
  ],
  authMiddleware('NORMAL'),
  ProductController.updateModeProduct
);

// Rota para registrar um pagamento
router.post('/payment/:cashId/confirm',
  upload.single('photo'),
  [
    param('cashId').notEmpty().withMessage('O id do caixa é obrigatório'),
    body('method').notEmpty().withMessage('O método de pagamento é obrigatório'),
    body('originalAmount').notEmpty().withMessage('O valor original é obrigatório'),
    body('discountAmount').notEmpty().withMessage('O valor do desconto é obrigatório'),
    body('finalAmount').notEmpty().withMessage('O valor final é obrigatório'),
    body('amountReceived').notEmpty().withMessage('O valor recebido é obrigatório'),
    body('changeGiven').notEmpty().withMessage('O valor do troco é obrigatório'),
    body('saleData').notEmpty().withMessage('Os dados da venda são obrigatórios'),
  ],
  authMiddleware('NORMAL'),
  ProductController.registerPayment
);

module.exports = router
