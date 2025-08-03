const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listProductService() {
  try {
    const products = await prisma.general_sale.findMany({
      where: {
        products: {
          is_active: true, // ← só pega produtos ativos
        }
      },
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
      unitPrice: Number(product.unit_price),
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
      where: {
        barcode,
        is_active: true // ← só pega produtos ativos
      },
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
          take: 1,
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
  try {
    await prisma.$transaction(async (tx) => {
      // 1. Verificar se existe um produto com o mesmo código de barras
      const existingProduct = await tx.products.findFirst({
        where: { barcode }
      });

      let productId;

      if (existingProduct) {
        if (existingProduct.is_active === false) {
          // 2. Produto inativo → reativa e atualiza
          const updatedProduct = await tx.products.update({
            where: { id: existingProduct.id },
            data: {
              product_name: productName,
              is_active: true
            }
          });

          productId = updatedProduct.id;
        } else {
          // 3. Produto já ativo → erro ou retorno false
          throw new Error("Produto com este código de barras já está ativo.");
        }
      } else {
        // 4. Produto não existe → cria novo
        const newProduct = await tx.products.create({
          data: {
            product_name: productName,
            barcode,
            is_active: true
          }
        });

        productId = newProduct.id;
      }

      // 5. Criar/atualizar os dados em general_sale
      const existingSale = await tx.general_sale.findUnique({
        where: { product_id: productId }
      });

      if (existingSale) {
        await tx.general_sale.update({
          where: { product_id: productId },
          data: {
            unit_price: unitPrice,
            quantity: quantity,
            expiration_date: expirationDate
          }
        });
      } else {
        await tx.general_sale.create({
          data: {
            product_id: productId,
            unit_price: unitPrice,
            quantity: quantity,
            expiration_date: expirationDate
          }
        });
      }
    });

    return true;
  } catch (err) {
    console.error("[createProductService] Erro:", err.message);
    return false;
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
          change_given: changeGiven,
          photo: photoBuffer,
          photo_type: photoMimeType,
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

async function editProductService(id, productName, barcode, unitPrice, quantity, expirationDate) {
  try {
    // 1. Verifica se o produto existe (usando UUID)
    const existingProduct = await prisma.products.findUnique({
      where: { id: id }, // UUID não precisa de parseInt
      include: {
        general_sale: true
      }
    });

    if (!existingProduct) {
      return false;
    }

    // 2. Verifica se houve alterações nos dados
    const hasChanges = 
      existingProduct.product_name !== productName ||
      existingProduct.barcode !== barcode ||
      existingProduct.general_sale[0].unit_price !== unitPrice ||
      existingProduct.general_sale[0].quantity !== quantity ||
      (existingProduct.general_sale[0].expiration_date?.getTime() !== expirationDate?.getTime());

    if (!hasChanges) {
      return false;
    }

    // 3. Atualiza os dados em transação
    await prisma.$transaction(async (tx) => {
      // Atualiza a tabela products
      await tx.products.update({
        where: { id: id },
        data: {
          product_name: productName,
          barcode: barcode
        }
      });

      // Atualiza a tabela general_sale
      await tx.general_sale.update({
        where: { product_id: id },
        data: {
          unit_price: unitPrice,
          quantity: quantity,
          expiration_date: expirationDate
        }
      });
    });

    return true;
  } catch (err) {
    // Tratamento específico para erro de duplicação no Prisma
    if (err.code === 'P2002') {
      const meta = err.meta || {};
      if (meta.target?.includes('product_name')) {
        throw new Error('Já existe um produto com este nome');
      }
      if (meta.target?.includes('barcode')) {
        throw new Error('Já existe um produto com este código de barras');
      }
    }
    throw err;
  }
}

async function deleteProductService(id, barcode) {
  try {
    const product = await prisma.products.findUnique({
      where: {
        id
      }
    });

    if (!product) {
      throw new Error("Produto não encontrado.");
    }

    if (product.barcode !== barcode) {
      throw new Error("Código de barras não corresponde ao produto.");
    }

    if (!product.is_active) {
      throw new Error("Produto já está inativo.");
    }

    await prisma.products.update({
      where: { id },
      data: {
        is_active: false
      }
    });

    return true;
  } catch (err) {
    console.error("[deleteProductService] Erro:", err.message);
    return false;
  }
}

module.exports = {
  listProductService,
  fetchProductService,
  createProductService,
  editProductService,
  deleteProductService,
  registerPayment
};
