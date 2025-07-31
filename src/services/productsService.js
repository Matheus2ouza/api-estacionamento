const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listProductService() {
  try {
    const products = await prisma.general_sale.findMany({
      include: {
        products: {
          select: {
            id: true,
            product_name: true,
            barcode: true
          }
        }
      }
    });

    if (!products || products.length === 0) {
      return false;
    }

    const mapped = products.map((product) => ({
      id: product.products.id,
      barcode: product.products?.barcode,
      productName: product.products?.product_name,
      unitPrice: Number(product.products),
      quantity: product.quantity,
      expirationDate: product.expiration_date,
    }));

    return mapped;
  } catch (err) {
    throw err;
  }
}

async function fetchProductService(barcode) {
  try {
    const result = await prisma.products.findFirst({
      where: { barcode },
      select: {
        id: true,
        product_name: true,
        barcode: true,
        general_sale: {
          select: {
            unit_price: true,
            quantity: true,
            expiration_date: true,
          },
          take: 1, // Pega só o primeiro registro
        },
      },
    });

    if (!result) return null;

    const generalSale = result.general_sale[0] || {};

    const product = {
      id: result.id,
      productName: result.product_name,
      barcode: result.barcode,
      unitPrice: generalSale.unit_price ?? null,
      quantity: generalSale.quantity ?? null,
      expirationDate: generalSale.expiration_date ?? null,
    };

    return product;
  } catch (err) {
    throw err;
  }
}

async function createProductService(productName, barcode, unitPrice, quantity, expirationDate) {
  const verifyProduct = await prisma.products.findFirst({
    where: { product_name: productName }
  });

  if (verifyProduct) {
    return false;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const registerNameProduct = await tx.products.create({
        data: {
          product_name: productName,
          barcode: barcode
        }
      });

      const generalSaleData = {
        productId: registerNameProduct.id,
        unit_price: unitPrice,
        quantity,
        ...(expirationDate && { expirationDate })
      };

      await tx.general_sale.create({
        data: generalSaleData
      });
    });

    return true;
  } catch (err) {
    throw err;
  }
}

async function registerPayment(
  operator,
  paymentMethod,
  cashRegisterId,
  totalAmount,
  discountValue,
  finalPrice,
  amountReceived,
  changeGiven,
  saleItems,
  local
) {
  // Verificar se o caixa existe
  const verifyCash = await prisma.cash_register.findUnique({
    where: { id: cashRegisterId },
  });

  if (!verifyCash) {
    throw new Error('Caixa não encontrado');
  }

  // Verificar se o operador existe
  const verifyOperator = await prisma.accounts.findUnique({
    where: { username: operator },
  });

  if (!verifyOperator) {
    throw new Error('Operador não encontrado');
  }

  // Verificar se todos os produtos existem
  for (const item of saleItems) {
    const exists = await prisma.products.findUnique({
      where: { id: item.productId },
    });

    if (!exists) {
      throw new Error(`Produto com ID ${item.productId} não encontrado no banco.`);
    }
  }

  try {
    const transactionId = await prisma.$transaction(async (tx) => {
      // Cria a transação do produto
      const transaction = await tx.product_transaction.create({
        data: {
          operator: verifyOperator.username,
          method: paymentMethod,
          transaction_date: local,
          cash_register_id: verifyCash.id,
          original_amount: totalAmount,
          discount_amount: discountValue,
          final_amount: finalPrice,
          amount_received: amountReceived,
          change_given: changeGiven
        },
      });

      // Prepara os saleItems com o id da transação
      const saleItemsData = saleItems.map((item) => ({
        product_transaction_id: transaction.id,
        product_id: item.productId || null,
        sold_quantity: item.soldQuantity,
        product_name: item.productName,
        unit_price: item.unitPrice,
        expiration_date: item.expirationDate || null,
      }));

      // Insere os SaleItems
      await tx.sale_items.createMany({
        data: saleItemsData,
      });

      // Atualiza o estoque em general_sale
      for (const item of saleItemsData) {
        if (item.product_id) {
          const generalSaleRecord = await tx.general_sale.findFirst({
            where: {
              product_id: item.product_id,
              expiration_date: item.expiration_date,
            },
          });

          if (!generalSaleRecord) {
            throw new Error(`Lote do produto ${item.product_name} não encontrado para atualizar estoque.`);
          }

          if (generalSaleRecord.quantity < item.sold_quantity) {
            throw new Error(`Quantidade insuficiente para o produto ${item.product_name}.`);
          }

          // Atualiza diminuindo a quantidade
          await tx.general_sale.update({
            where: { id: generalSaleRecord.id },
            data: {
              quantity: generalSaleRecord.quantity - item.sold_quantity,
            },
          });
        }
      }
      
      return transaction.id;
    });

    // Atualiza o valor final do caixa
    if (transactionId) {
      await prisma.cash_register.update({
        where: { id: cashRegisterId },
        data: {
          final_value: {
            increment: finalPrice
          },
          general_sale_total: {
            increment: finalPrice
          }
        }
      });
    }

    return transactionId;
  } catch (error) {
    throw new Error('Erro ao registrar pagamento: ' + error.message);
  }
}

module.exports = {
  listProductService,
  fetchProductService,
  createProductService,
  registerPayment
};
