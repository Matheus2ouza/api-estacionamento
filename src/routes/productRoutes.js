const express = require('express');
const { body, param } = require('express-validator');
const multer = require('multer');
const authMiddleware = require('../middlewares/authMiddleware');
const ProductController = require('../controllers/productController')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(), // mantém o arquivo na memória (buffer)
  limits: { fileSize: 10 * 1024 * 1024 } // limite de 10MB (ajuste se quiser)
});

router.get('/list-products', authMiddleware('NORMAL'), ProductController.listProducts)

router.get('/fetch-product/:barcode',
  [
    param("barcode").exists().notEmpty()
  ],
  authMiddleware("NORMAL"),
  ProductController.fetchProduct
)

router.post('/create-product',
  [
    body('productName').notEmpty(),
    body('barcode').notEmpty(),
    body('unitPrice').isDecimal({ decimal_digits: '0,2' }),
    body('quantity').isInt({ gt: 0 }),
  ],
  authMiddleware('NORMAL'),
  ProductController.createProduct
);

router.post('/edit-product',
  [
    body('productName').notEmpty(),
    body('barcode').notEmpty(),
    body('unitPrice').isDecimal({ decimal_digits: '0,2' }),
    body('quantity').isInt({ gt: 0 }),
  ],
  authMiddleware('NORMAL'),
  ProductController.editProduct
);

router.post('/delete-product/:id/:barcode', authMiddleware('NORMAL'), ProductController.deleteProduct)

router.post(
  '/register-payment',
  upload.single('receiptImage'),
  (req, res, next) => {
    // Converte saleItems (que vem como string via FormData) para array
    if (req.body.saleItems && typeof req.body.saleItems === 'string') {
      try {
        req.body.saleItems = JSON.parse(req.body.saleItems);
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: 'Formato inválido de saleItems.',
        });
      }
    }
    next();
  },
  [
    body("paymentMethod").exists().notEmpty(),
    body("cashRegisterId").exists().notEmpty(),
    body("totalAmount").exists().notEmpty(),
    body("discountValue").exists().notEmpty(),
    body("finalPrice").exists().notEmpty(),
    body("amountReceived").exists().notEmpty(),
    body("changeGiven").exists().notEmpty(),
    body("saleItems").isArray({ min: 1 }),
  ],
  authMiddleware("NORMAL"),
  ProductController.registerPayment
);


module.exports = router