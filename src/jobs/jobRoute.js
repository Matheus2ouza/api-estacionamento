const express = require("express");
const router = express.Router();
const jobController = require("./jobController");

router.post("/close-cash", jobController.closeCashRegister);

module.exports = router;
