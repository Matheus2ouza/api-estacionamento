const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listProductService() {
  try {
    const products = await prisma.generalSale.findMany({
      include: {
        product: {
          select: {
            productName: true,
            barcode: true
          }
        }
      }
    });

    if (!products || products.length === 0) {
      return false;
    }

    const mapped = products.map((product) => ({
      id: product.id,
      barcode: product.product?.barcode,
      productName: product.product?.productName,
      unitPrice: Number(product.unitPrice),
      quantity: product.quantity,
      expirationDate: product.expirationDate,
    }));

    return mapped;
  } catch (err) {
    throw err;
  }
}

async function fetchProductService(barcode) {
  try {
    const result = await prisma.product.findFirst({
      where: { barcode },
      select: {
        id: true,
        productName: true,
        barcode: true,
        generalSales: {
          select: {
            unitPrice: true,
            quantity: true,
            expirationDate: true,
          },
          take: 1, // Pega só o primeiro registro
        },
      },
    });

    if (!result) return null;

    const generalSale = result.generalSales[0] || {};

    const product = {
      id: result.id,
      productName: result.productName,
      barcode: result.barcode,
      unitPrice: generalSale.unitPrice ?? null,
      quantity: generalSale.quantity ?? null,
      expirationDate: generalSale.expirationDate ?? null,
    };

    return product;
  } catch (err) {
    throw err;
  }
}

async function createProductService(productName, barcode, unitPrice, quantity, expirationDate) {
  const verifyProduct = await prisma.product.findFirst({
    where: { productName }
  });

  if (verifyProduct) {
    return false;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const registerNameProduct = await tx.product.create({
        data: {
          productName: productName,
          barcode: barcode
        }
      });

      const generalSaleData = {
        productId: registerNameProduct.id,
        unitPrice,
        quantity,
        ...(expirationDate && { expirationDate })
      };

      await tx.generalSale.create({
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
  saleItems,
  local
) {
  const verifyCash = await prisma.cashRegister.findUnique({
    where: { id: cashRegisterId },
  });

  if (!verifyCash) {
    throw new Error('Caixa não encontrado');
  }

  const verifyOperator = await prisma.account.findUnique({
    where: { username: operator },
  });

  if (!verifyOperator) {
    throw new Error('Operador não encontrado');
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Cria a transação do produto
      const transaction = await tx.productTransaction.create({
        data: {
          operator: verifyOperator.username,
          paymentMethod,
          transactionDate: local,
          cashRegisterId: verifyCash.id,
          originalAmount: totalAmount,
          discountAmount: discountValue,
          finalAmount: finalPrice,
        },
      });

      // Prepara os saleItems com o id da transação
      const saleItemsData = saleItems.map((item) => ({
        productTransactionId: transaction.id,
        productId: item.productId || null,
        soldQuantity: item.soldQuantity,
        productName: item.productName,
        unitPrice: item.unitPrice,
        expirationDate: item.expirationDate || null,
      }));

      // Insere os SaleItems
      await tx.saleItem.createMany({
        data: saleItemsData,
      });

      for (const item of saleItemsData) {

        const generalSaleRecord = await tx.generalSale.findFirst({
          where: {
            productId: item.productId,
            expirationDate: item.expirationDate,
          },
        });

        if (!generalSaleRecord) {
          throw new Error(`Lote do produto ${item.productName} não encontrado para atualizar estoque.`);
        }

        if (generalSaleRecord.quantity < item.soldQuantity) {
          throw new Error(`Quantidade insuficiente para o produto ${item.productName}.`);
        }

        // Atualiza diminuindo a quantidade
        await tx.generalSale.update({
          where: { id: generalSaleRecord.id },
          data: {
            quantity: generalSaleRecord.quantity - item.soldQuantity,
          },
        });

        await tx.cashRegister.update({
          where: {id: cashRegisterId},
          data: {
            finalValue: {
              increment: finalPrice
            }
          }
        })
      }
    });

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
