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
    where: {productName: productName}
  })

  if(verifyProduct) {
    return false
  }

  try {
    await prisma.$transaction( async (tx) => {
      console.log(`[ProductsService] Ristrando o nome do produto`)
      const registerNameProduct = await prisma.product.create({
        data: {
          productName: productName
        }
      })

      console.log(`[ProductsService] Ristrando dados do produto`)
      await prisma.generalSale.create({
        data: {
          productId: registerNameProduct.id,
          unitPrice: unitPrice,
          quantity: quantity,
          expirationDate: expirationDate
        }
      })
    })
  } catch (err) {
    throw err
  }
}

module.exports = {
  listProductService,
  createProductService
};
