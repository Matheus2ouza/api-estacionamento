# Testes do Gerador de PDF

Esta pasta contém scripts para testar o gerador de PDF de recibos de saída de veículos.

## Arquivos

- `simple-pdf-test.js` - Teste rápido com dados simples
- `test-improved-utils.js` - Script para testar o arquivo melhorado da pasta utils
- `output/` - Pasta onde os PDFs gerados são salvos

## Como Executar

### Teste Rápido

```bash
cd /home/cabeca/Documentos/api-estacionamento
node test/simple-pdf-test.js
```

### Teste do Arquivo Melhorado da Pasta Utils

```bash
cd /home/cabeca/Documentos/api-estacionamento
node test/test-improved-utils.js
```

## Dados de Teste

### Teste Rápido

- **Operador**: João Silva
- **Método**: DINHEIRO
- **Placa**: ABC-1234
- **Valor Recebido**: R$ 20,00
- **Desconto**: R$ 2,50
- **Troco**: R$ 2,50
- **Valor Final**: R$ 15,00
- **Valor Original**: R$ 17,50

### Teste Completo

O teste completo gera 5 PDFs diferentes com cenários variados:

1. **Pagamento em Dinheiro com Troco**
2. **Pagamento PIX sem Troco**
3. **Pagamento Cartão com Desconto**
4. **Pagamento Débito sem Desconto**
5. **Dados principais** (mesmo do teste rápido)

## Estrutura dos PDFs Gerados

Cada PDF contém:

- Logo da empresa
- Título "COMPROVANTE DE SAÍDA"
- Informações do operador e método de pagamento
- Placa do veículo em destaque
- Valores detalhados (original, desconto, final)
- Valor recebido e troco
- Horário de funcionamento
- Contato WhatsApp
- Mensagem de agradecimento

## Arquivos do Sistema

### Gerador de PDF Original

- **Arquivo**: `src/utils/vehicleReceiptPDF.js`
- **Função**: `generateVehicleReceiptPDF`
- **Uso**: Sistema atual

### Gerador de PDF Melhorado

- **Arquivo**: `src/utils/vehicleReceiptPDFImproved.js`
- **Função**: `generateVehicleReceiptPDFImproved`
- **Uso**: Layout melhorado com design em preto e branco

## Melhorias Implementadas

### 🎨 Design Visual

- **Cabeçalho colorido** com fundo azul escuro (#2c3e50)
- **Cards informativos** para operador e método de pagamento
- **Placa destacada** com fundo azul e bordas
- **Seção de valores** com destaque para o total
- **Rodapé colorido** com informações de contato

### 🎯 Hierarquia Visual

- **Títulos destacados** com cores contrastantes
- **Linhas separadoras** decorativas com círculos
- **Tipografia melhorada** com diferentes pesos e tamanhos
- **Espaçamento otimizado** para melhor legibilidade

### 🎨 Paleta de Cores

- **Azul escuro** (#2c3e50) - Cabeçalho e títulos
- **Azul claro** (#3498db) - Placa e elementos de destaque
- **Laranja** (#f39c12) - Total destacado
- **Cinza escuro** (#34495e) - Rodapé
- **Cinza claro** (#ecf0f1) - Cards informativos

### 📏 Layout Melhorado

- **Altura aumentada** de 240px para 280px
- **Margens otimizadas** para melhor aproveitamento do espaço
- **Cards organizados** para informações principais
- **Rodapé estruturado** com informações de contato

## Verificação

Após executar os testes, verifique:

1. Se os PDFs foram criados na pasta `output/`
2. Se os PDFs abrem corretamente
3. Se o conteúdo está formatado adequadamente
4. Se as fontes e imagens estão sendo carregadas

## Solução de Problemas

### Erro de Fontes

Se houver erro de fontes, verifique se os arquivos estão em:

- `src/public/fonts/Oswald/Oswald-Bold.ttf`
- `src/public/fonts/OpenSans_SemiCondensed/normal/`
- `src/public/fonts/OpenSans_Condensed/normal/`

### Erro de Imagens

Se houver erro de imagens, verifique se os arquivos estão em:

- `src/public/img/png/logo.png`
- `src/public/img/png/whatsapp.png`

### Erro de Permissão

Se houver erro de permissão para criar a pasta `output/`, execute:

```bash
chmod 755 test/
```
