const express = require('express');
const { body, param } = require('express-validator');
const cashController = require('../controllers/cashController')
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/status', authMiddleware('NORMAL'), cashController.statusCash)



module.exports = router;