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

exports.fetchProduct = async(req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { barcode } = req.params

  try{
    const product = await productsService.fetchProductService(barcode);

    if(!product) {
      console.log(`[ProductController] Tentativa de buscar produto com codigo de barra: ${barcode} mas não foi encontrado nenhum produto`);
      return res.status(404).json({
        success: false,
        message: "Nenhum produto encontrado"
      });
    }
    
    return res.status(200).json({
      success: true,
      product: product
    })
  } catch (error) {
    console.error(`[ProductController] Erro ao tentar buscar o produto: ${error}`)
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    })
  }
}

exports.createProduct = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { productName, barcode, unitPrice, quantity, expirationDate } = req.body;

  try {
    let parsedExpiration = null;

    // Validação da data de validade
    if (expirationDate) {
      // Verificar formato MM/AAAA
      if (!/^\d{2}\/\d{4}$/.test(expirationDate)) {
        return res.status(400).json({
          success: false,
          message: 'Formato de validade inválido. Use MM/AAAA.',
        });
      }

      const [monthStr, yearStr] = expirationDate.split('/');
      const month = parseInt(monthStr, 10);
      const year = parseInt(yearStr, 10);

      // Validar mês (1-12)
      if (month < 1 || month > 12) {
        return res.status(400).json({
          success: false,
          message: 'Mês inválido na validade. Deve ser entre 01 e 12.',
        });
      }

      // Validar se a data não está no passado
      const now = new Date();
      const currentMonth = now.getMonth() + 1; // Janeiro = 1
      const currentYear = now.getFullYear();

      // Verificar se a data é anterior ao mês/ano atual
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return res.status(400).json({
          success: false,
          message: 'A validade não pode ser anterior ao mês/ano atual.',
        });
      }

      // Converter para objeto Date (primeiro dia do mês)
      parsedExpiration = new Date(year, month - 1, 1);
    }

    const created = await productsService.createProductService(
      productName,
      barcode,
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