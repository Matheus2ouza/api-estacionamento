const { validationResult, Result } = require('express-validator');
const productsService = require('../services/productsService');
const { DateTime } = require("luxon");
const { generateReceiptPDF } = require('../utils/invoicGrenerator');
const { validateAndConvertExpirationDate } = require('../utils/timeConverter');

exports.listProducts = async (req, res) => {
  try {
    const { cursor, limit } = req.query;
    const result = await productsService.listProductService(cursor, limit);

    // Se não há produtos, retorna 404
    if (!result.products || result.products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum produto encontrado.',
        data: {
          products: [],
          nextCursor: null,
          hasMore: false
        }
      });
    }

    // Se há produtos, retorna 200
    return res.status(200).json({
      success: true,
      message: 'Produtos encontrados com sucesso.',
      data: {
        products: result.products,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore
      }
    });
  } catch (error) {
    // Se houve erro no service, retorna 500
    console.error(`[ProductController] Erro na busca da lista de produtos: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao buscar produtos.',
    });
  }
};

exports.fetchProductByBarcode = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { barcode } = req.query;

  try {
    const product = await productsService.fetchProductByBarcodeService(barcode);

    return res.status(200).json({
      success: true,
      message: 'Produto encontrado com sucesso.',
      data: product,
    });
  } catch (error) {
    console.error("[ProductController] Erro ao tentar buscar produto por barcode:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message,
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

  const { productName, barcode, unitPrice, quantity, expirationDate } = req.body;

  try {
    console.log(productName, barcode, unitPrice, quantity, expirationDate);

    // Validação e conversão da data de validade
    const expirationValidation = validateAndConvertExpirationDate(expirationDate);

    if (!expirationValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: expirationValidation.error,
      });
    }

    const created = await productsService.createProductService({
      productName: productName,
      barcode: barcode,
      unitPrice: parseFloat(unitPrice),
      quantity: parseInt(quantity),
      expirationDate: expirationValidation.date
    });

    console.log(created);

    // Se chegou até aqui, o produto foi criado com sucesso
    return res.status(201).json({
      success: true,
      message: 'Produto cadastrado com sucesso.',
      data: created.id
    });
  } catch (error) {
    console.error(`[ProductController] Erro ao tentar cadastrar o produto:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao cadastrar o produto.',
    });
  }
};

exports.updateProduct = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  }

  const { productId } = req.params;
  const { productName, barcode, unitPrice, quantity, expirationDate, isActive } = req.body;

  // Validar data de expiração se fornecida
  const expirationValidation = validateAndConvertExpirationDate(expirationDate);
  if (!expirationValidation.isValid) {
    return res.status(400).json({ success: false, message: expirationValidation.error });
  }

  try {
    const updated = await productsService.updateProductService(productId, {
      productName: productName,
      barcode: barcode,
      unitPrice: parseFloat(unitPrice),
      quantity: parseInt(quantity),
      expirationDate: expirationValidation.date,
      isActive: isActive
    });

    return res.status(200).json({
      success: true,
      message: 'Produto atualizado com sucesso.',
      data: updated.id
    });
  } catch (error) {
    console.error(`[ProductController] Erro ao tentar atualizar o produto:`, error.message);
    return res.status(500).json({
      success: false,
      message: 'Erro interno ao atualizar o produto.',
    });
  }
};

exports.updateModeProduct = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("Erros encontrados:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
    });
  };

  const { productId } = req.params;
  const { mode } = req.query;

  try {
    // Converte mode para boolean
    const isActive = mode === 'true';

    await productsService.updateProductModeService(productId, isActive);

    const statusMessage = isActive ? 'ativado' : 'desativado';
    return res.status(200).json({
      success: true,
      message: `Produto ${statusMessage} com sucesso.`,
    });
  } catch (error) {
    console.error("[ProductController] Erro ao tentar atualizar modo do produto:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao atualizar produto.',
    });
  }
};

exports.registerPayment = async (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    console.log("Erros encontrados:", errors.array());
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos. Verifique os campos e tente novamente.',
      errors: errors.array(),
    });
  }

  const { cashId } = req.params;

  // Para FormData, os dados vêm direto do body
  const {
    method,
    originalAmount,
    discountAmount,
    finalAmount,
    amountReceived,
    changeGiven,
    saleData,
    photo
  } = req.body;

  // Se saleData veio como string (FormData), precisa fazer parse
  let parsedSaleData = saleData;
  if (typeof saleData === 'string') {
    try {
      parsedSaleData = JSON.parse(saleData);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Erro ao processar dados da venda. Formato inválido.',
      });
    }
  }

  if (!parsedSaleData?.products || !Array.isArray(parsedSaleData.products)) {
    return res.status(400).json({
      success: false,
      message: 'Os produtos da venda (saleData.products) devem ser um array.',
    });
  }

  // Converte todos os valores numéricos para garantir o formato correto
  const numericOriginalAmount = Number(originalAmount);
  const numericDiscountAmount = Number(discountAmount);
  const numericFinalAmount = Number(finalAmount);
  const numericAmountReceived = Number(amountReceived);
  const numericChangeGiven = Number(changeGiven);

  // Valida se os valores são números válidos
  if (isNaN(numericOriginalAmount) || isNaN(numericDiscountAmount) ||
    isNaN(numericFinalAmount) || isNaN(numericAmountReceived) ||
    isNaN(numericChangeGiven)) {
    return res.status(400).json({
      success: false,
      message: 'Valores numéricos inválidos. Verifique os campos de valores.',
    });
  }

  // Para FormData, a foto vem como arquivo
  const photoBuffer = req.file ? req.file.buffer : (photo || null);
  const photoMimeType = req.file ? req.file.mimetype : (photo ? 'image/jpeg' : null);
  const user = req.user;

  try {
    const local = DateTime.now().setZone("America/Belem");

    // O método já vem no formato correto (CREDITO, PIX, etc.)
    const normalizedMethod = method.toUpperCase();

    // Valida se o método é válido
    const validMethods = ["DINHEIRO", "PIX", "CREDITO", "DEBITO"];
    if (!validMethods.includes(normalizedMethod)) {
      throw new Error("Método de pagamento inválido");
    }

    const saleItemsToInsert = parsedSaleData.products.map((item) => {
      if (!item?.id) {
        throw new Error("Produto sem ID. Verifique os itens do carrinho.");
      }

      // Converte valores numéricos dos produtos
      const numericQuantity = Number(item.quantity);
      const numericUnitPrice = Number(item.unitPrice);

      if (isNaN(numericQuantity) || isNaN(numericUnitPrice)) {
        throw new Error(`Valores inválidos para o produto ${item.productName}`);
      }

      return {
        productId: item.id,
        soldQuantity: numericQuantity,
        productName: item.productName,
        unitPrice: numericUnitPrice,
        expirationDate: item.expirationDate || null,
      };
    });

    const transactionId = await productsService.registerPayment(
      user.username,
      normalizedMethod,
      cashId,
      numericOriginalAmount,
      numericDiscountAmount,
      numericFinalAmount,
      numericAmountReceived,
      numericChangeGiven,
      saleItemsToInsert,
      local,
      photoBuffer,
      photoMimeType
    );
    console.log("Tudo ok ate aqui")
    console.log(`[ProductController] Transaction ID:`, transactionId);

    const receipt = await generateReceiptPDF(
      user.username,
      method,
      saleItemsToInsert,
      numericOriginalAmount,
      numericDiscountAmount,
      numericFinalAmount,
      numericAmountReceived,
      numericChangeGiven,
    );

    return res.status(201).json({
      success: true,
      transactionId,
      receipt,
      message: receipt
        ? "Pagamento registrado com sucesso."
        : "Pagamento registrado, mas o comprovante não foi gerado.",
    });

  } catch (error) {
    console.error("Erro ao registrar pagamento:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || 'Erro interno ao registrar pagamento.',
    });
  }
};

