const express = require("express");
const { body, param, query } = require("express-validator");
const authMiddleware = require("../middlewares/authMiddleware");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.get(
  "/:cashId/view",
  [
    param("cashId").exists().isString()
  ],
  authMiddleware("ADMIN"),
  dashboardController.dashboard
);

router.get('/reports',
  [
    query('pdf').optional().isBoolean(),
    query('type').optional().isString(),
    query('startDate').optional().isString(),
    query('endDate').optional().isString(),
    query('details').optional().isBoolean(),
    query('charts').optional().isString(),
  ],
  authMiddleware("ADMIN"),
  dashboardController.reports
);

router.post('/goals',
  [
    query('goalPeriod').optional().isString(),
    query('goalValue').optional().isString(),
    query('isActive').optional().isBoolean(),
  ],
  authMiddleware("MANAGER"),
  dashboardController.goals
);

router.get('/goals', authMiddleware("MANAGER"), dashboardController.listGoals);

router.put('/goals',
  [
    query('goalPeriod').optional().isString()
  ],
  authMiddleware("MANAGER"),
  dashboardController.desactivateGoal
);

router.get('/goals/charts',
  [
    query('goalPeriod').notEmpty().isIn(['DIARIA', 'SEMANAL', 'MENSAL']).withMessage('goalPeriod deve ser DIARIA, SEMANAL ou MENSAL'),
    query('charts').notEmpty().isString().withMessage('charts é obrigatório')
  ],
  authMiddleware("MANAGER"),
  dashboardController.charts
)

module.exports = router;
