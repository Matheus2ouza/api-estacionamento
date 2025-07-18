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
  fetchProductService,
  createProductService
};
