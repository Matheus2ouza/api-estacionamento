const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listProductService() {
  try {
    const products = await prisma.generalSale.findMany({
      include: {
        product: {
          select: {
            productName: true
          }
        }
      }
    });

    if (!products || products.length === 0) {
      return false;
    }

    const mapped = products.map((product) => ({
      id: product.id,
      productName: product.product?.productName ?? 'Produto removido',
      unitPrice: product.unitPrice,
      quantity: product.quantity,
      expirationDate: product.expirationDate,
    }));

    return mapped;
  } catch (err) {
    throw err;
  }
}

async function createProductService(productName, unitPrice, quantity, expirationDate) {
  const verifyProduct = await prisma.product.findFirst({
    where: { productName }
  });

  if (verifyProduct) {
    return false;
  }

  try {
    await prisma.$transaction(async (tx) => {
      const registerNameProduct = await tx.product.create({
        data: { productName }
      });

      const generalSaleData = {
        productId: registerNameProduct.id,
        unitPrice,
        quantity,
        ...(expirationDate && { expirationDate }) // só inclui se estiver presente
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

module.exports = {
  listProductService,
  createProductService
};
