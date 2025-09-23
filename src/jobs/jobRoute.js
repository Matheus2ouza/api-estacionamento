const express = require("express");
const router = express.Router();
const jobService = require("./jobController");

router.post("/close-cash", async (req, res) => {
  try {
    await jobService.closeCashRegister();
    res.json({ success: true, message: "Caixa fechado automaticamente!" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
