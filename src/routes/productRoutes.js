const express = require('express');
const { body, param } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const ProductController = require('../controllers/productController')

const router = express.Router()

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


module.exports = router