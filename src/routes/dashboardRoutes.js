const express = require('express');
const { body, param, query } = require('express-validator');
const authMiddleware = require('../middlewares/authMiddleware');
const dashboardController = require('../controllers/dashboardController')

const router = express.Router()

router.get('/historic', authMiddleware('NORMAL'), dashboardController.historic)

router.get('/historic-by-cash/:id', authMiddleware('NORMAL'), dashboardController.historicCash)

router.get('/second-copy/:id',
  [
    param("id").exists().notEmpty(),
    query("type").exists().notEmpty()
  ],
  authMiddleware('NORMAL'),
  dashboardController.secondCopy
)

router.get('/photo-proof/:id',
  [
    param("id").exists().notEmpty(),
    query("type").exists().notEmpty()
  ],
  authMiddleware('NORMAL'),
  dashboardController.photoProof
)

router.get("/goalConfig", authMiddleware('ADMIN'), dashboardController.getGoalConfig);

router.post("/saveGoalConfig", authMiddleware('ADMIN'), dashboardController.saveGoalConfig);

router.get("/general-details/:id", authMiddleware('ADMIN'), dashboardController.generalDetails)

module.exports = router