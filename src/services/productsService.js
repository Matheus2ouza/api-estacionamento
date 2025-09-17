const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Estrutura para mensagens
const createMessage = (userMessage, logMessage) => ({
  userMessage,
  logMessage
});

async function listProductService(cursor, limit) {
  try {
    const whereQuery = {
      // Remove a restrição de isActive para trazer todos os produtos (ativos e desativados)
      ...(cursor ? { id: { gt: cursor } } : {})
    };

    const limitNumber = Number(limit) || 10;
    const takeLimit = limitNumber + 1; // Busca 1 a mais para verificar se há mais registros

    const products = await prisma.generalSale.findMany({
      where: whereQuery,
      include: {
        products: {
          select: {
            id: true,
            productName: true,
            barcode: true,
            isActive: true
          }
        }
      },
      orderBy: {
        id: 'asc',
      },
      take: takeLimit,
    });

    // Se não há produtos, retorna null (não é erro)
    if (!products || products.length === 0) {
      console.log('[ProductsService] Nenhum produto encontrado');
      return {
        products: [],
        nextCursor: null,
        hasMore: false
      };
    }

    // Verifica se há mais registros
    const hasMore = products.length > limitNumber;

    // Remove o registro extra se existir
    const finalProducts = hasMore ? products.slice(0, limitNumber) : products;

    const mapped = finalProducts.map((product) => ({
      id: product.products.id,
      barcode: product.products?.barcode,
      productName: product.products?.productName,
      isActive: product.products?.isActive,
      unitPrice: Number(product.unitPrice),
      quantity: product.quantity,
      expirationDate: product.expirationDate,
    }));

    const nextCursor = finalProducts.length > 0 ? finalProducts[finalProducts.length - 1].id : null;

    return {
      products: mapped,
      nextCursor,
      hasMore
    };
  } catch (err) {
    console.error('[ProductsService] Erro ao buscar produtos:', err);
    throw err;
  }
};

async function fetchProductByBarcodeService(barcode) {
  try {
    const product = await prisma.products.findFirst({
      where: { barcode: barcode, isActive: true },
      select: {
        id: true,
        productName: true,
        barcode: true,
        generalSale: {
          select: {
            unitPrice: true,
            quantity: true,
            expirationDate: true
          }
        }
      }
    })

    if (!product) {
      const message = createMessage(
        'Produto não encontrado',
        `[ProductsService] Tentativa de buscar produto inexistente com barcode: ${barcode}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    const formatedProduct = {
      id: product.id,
      barcode: product.barcode || null,
      productName: product.productName,
      unitPrice: product.generalSale.unitPrice,
      quantity: product.generalSale.quantity,
      expirationDate: product.generalSale.expirationDate || null
    }

    return formatedProduct;
  } catch (error) {
    console.error("[fetchProductByBarcodeService] Erro:", error.message);
    throw error;
  }
}

async function createProductService({ productName, barcode, unitPrice, quantity, expirationDate }) {
  try {
    let productId;

    await prisma.$transaction(async (tx) => {
      let existingProduct = null;

      // 1. Verificar se existe um produto com o mesmo código de barras (apenas se barcode foi fornecido)
      if (barcode) {
        existingProduct = await tx.products.findFirst({
          where: { barcode }
        });
      }

      if (existingProduct) {
        if (existingProduct.isActive === false) {
          // 2. Produto inativo → reativa e atualiza
          const updatedProduct = await tx.products.update({
            where: { id: existingProduct.id },
            data: {
              productName: productName,
              isActive: true
            }
          });

          productId = updatedProduct.id;
        } else {
          // 3. Produto já ativo → erro
          const message = createMessage(
            "Produto com este código de barras já está ativo.",
            "[ProductsService] Produto com este código de barras já está ativo."
          );
          console.warn(message.logMessage);
          throw new Error(message.userMessage);
        }
      } else {
        // 4. Produto não existe → cria novo
        const newProduct = await tx.products.create({
          data: {
            productName: productName,
            barcode: barcode || null, // Garante que seja null se não fornecido
            isActive: true
          }
        });

        productId = newProduct.id;
      }

      // 5. Criar/atualizar os dados em general_sale
      const existingSale = await tx.generalSale.findUnique({
        where: { productId: productId }
      });

      if (existingSale) {
        await tx.generalSale.update({
          where: { productId: productId },
          data: {
            unitPrice: unitPrice,
            quantity: quantity,
            expirationDate: expirationDate
          }
        });
      } else {
        await tx.generalSale.create({
          data: {
            productId: productId,
            unitPrice: unitPrice,
            quantity: quantity,
            expirationDate: expirationDate
          }
        });
      }
    });

    return { id: productId };
  } catch (err) {
    console.error("[createProductService] Erro:", err.message);
    throw err;
  }
};

async function updateProductModeService(productId, isActive) {
  try {
    const product = await prisma.products.findUnique({
      where: { id: productId }
    });

    console.log("[ProductsService] Produto encontrado: ", product);
    console.log(`[ProductsService] isActive antes da atualização: ${product.isActive}`);

    if (!product) {
      const message = createMessage(
        'Produto não encontrado',
        `[ProductsService] Tentativa de atualizar produto inexistente com ID: ${productId}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    // Atualiza apenas o isActive do produto
    await prisma.products.update({
      where: { id: productId },
      data: { isActive: isActive }
    });

    console.log("[ProductsService] Produto atualizado: ", product);
    console.log(`[ProductsService] isActive depois da atualização: ${product.isActive}`);

    return { success: true };
  } catch (error) {
    console.error("[updateProductModeService] Erro:", error.message);
    throw error;
  }
}

async function updateProductService(productId, { productName, barcode, unitPrice, quantity, expirationDate, isActive }) {
  try {
    const product = await prisma.products.findUnique({
      where: { id: productId },
    });

    if (!product) {
      const message = createMessage(
        'Produto não encontrado',
        `[ProductsService] Tentativa de atualizar produto inexistente com ID: ${productId}`
      );
      console.warn(message.logMessage);
      throw new Error(message.userMessage);
    }

    await prisma.$transaction(async (tx) => {
      // 1. Verificar se o novo código de barras já existe em outro produto (apenas se barcode foi fornecido)
      if (barcode && barcode !== product.barcode) {
        const existingProduct = await tx.products.findFirst({
          where: {
            barcode: barcode,
            id: { not: productId } // Exclui o produto atual da busca
          }
        });

        if (existingProduct) {
          const message = createMessage(
            "Já existe um produto com este código de barras.",
            "[ProductsService] Tentativa de atualizar produto com código de barras já existente."
          );
          console.warn(message.logMessage);
          throw new Error(message.userMessage);
        }
      }

      // 2. Atualizar o produto
      await tx.products.update({
        where: { id: productId },
        data: {
          productName: productName,
          barcode: barcode || null, // Garante que seja null se não fornecido
          isActive: isActive
        }
      });

      // 3. Atualizar os dados em general_sale
      const existingSale = await tx.generalSale.findUnique({
        where: { productId: productId }
      });

      if (existingSale) {
        await tx.generalSale.update({
          where: { productId: productId },
          data: {
            unitPrice: unitPrice,
            quantity: quantity,
            expirationDate: expirationDate
          }
        });
      } else {
        // Se não existe registro em general_sale, cria um novo
        await tx.generalSale.create({
          data: {
            productId: productId,
            unitPrice: unitPrice,
            quantity: quantity,
            expirationDate: expirationDate
          }
        });
      }
    });

    return { id: productId };
  } catch (error) {
    console.error("[updateProductService] Erro:", error.message);
    throw error;
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
  local,
  photoBuffer,
  photoMimeType
) {
  // Verificar se o caixa existe
  const verifyCash = await prisma.cashRegister.findUnique({
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
      const transaction = await tx.productTransaction.create({
        data: {
          operator: verifyOperator.username,
          method: paymentMethod,
          transactionDate: local,
          cashRegisterId: verifyCash.id,
          originalAmount: totalAmount,
          discountAmount: discountValue,
          finalAmount: finalPrice,
          amountReceived: amountReceived,
          changeGiven: changeGiven,
          photo: photoBuffer,
          photoType: photoMimeType,
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
      await tx.saleItems.createMany({
        data: saleItemsData,
      });

      // Atualiza o estoque em general_sale
      for (const item of saleItemsData) {
        if (item.productId) {
          // Busca o registro de estoque do produto
          const generalSaleRecord = await tx.generalSale.findUnique({
            where: {
              productId: item.productId
            }
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
        }
      }

      return transaction.id;
    });

    // Atualiza o valor final do caixa
    if (transactionId) {
      await prisma.cashRegister.update({
        where: { id: cashRegisterId },
        data: {
          finalValue: {
            increment: finalPrice
          },
          generalSaleTotal: {
            increment: finalPrice
          }
        }
      });
    }

    return transactionId;
  } catch (error) {
    throw new Error('Erro ao registrar pagamento: ' + error.message);
  }
};


module.exports = {
  listProductService,
  fetchProductByBarcodeService,
  createProductService,
  updateProductService,
  updateProductModeService,
  registerPayment
};
