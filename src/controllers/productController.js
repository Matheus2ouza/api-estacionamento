const { validationResult, Result } = require('express-validator');
const productsService = require('../services/productsService');

exports.listProducts = async (req, res) => {
  try {
    const list = await productsService.listProductService();

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum produto encontrado.',
        list: []
      });
    }

    return res.status(200).json({
      success: true,
      list
    });
  } catch (error) {
    console.error(`[ProductController] Erro na busca da lista de produtos: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar produtos.',
      error: error.message
    });
  }
};


exports.createProduct = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { productName, unitPrice, quantity, expirationDate } = req.body;

  console.log(expirationDate)

  try {
    let parsedExpiration = null;

    // Só tenta converter se a data existir
    if (expirationDate && typeof expirationDate === 'string') {
      const [month, year] = expirationDate.split('/');
      if (month && year) {
        parsedExpiration = new Date(`${year}-${month}-01`);
      }
    }

    const created = await productsService.createProductService(
      productName,
      parseFloat(unitPrice),
      parseInt(quantity),
      parsedExpiration
    );

    if (!created) {
      return res.status(400).json({
        success: false,
        message: 'Produto já cadastrado',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'O produto foi cadastrado com sucesso',
    });
  } catch (error) {
    console.error(`[ProductController] Erro ao tentar cadastrar o produto:`, error);

    return res.status(500).json({
      success: false,
      message: 'Erro interno ao cadastrar o produto.',
      error: error.message,
    });
  }
};
