# 🅿️ API Estacionamento

Sistema de gerenciamento de estacionamento com relatórios avançados e análise de dados.

## 📊 Sistema de Relatórios

### 🎯 Visão Geral

O sistema de relatórios permite gerar análises detalhadas do funcionamento do estacionamento, incluindo dados financeiros, operacionais e gráficos visuais para tomada de decisão.

### 🔧 Como Gerar Relatórios

#### **Endpoint Principal**

```
GET /dashboard/reports
```

#### **Parâmetros de Query**

| Parâmetro   | Tipo    | Obrigatório | Descrição                                                                |
| ----------- | ------- | ----------- | ------------------------------------------------------------------------ |
| `type`      | string  | ✅          | Tipo do relatório: `full`, `daily`, `weekly`, `monthly`                  |
| `startDate` | string  | ❌          | Data de início (formato: YYYY-MM-DD). Se não informado, usa a data atual |
| `details`   | boolean | ❌          | Se `true`, inclui transações detalhadas no relatório                     |
| `charts`    | string  | ❌          | Gráficos a incluir, separados por vírgula                                |

#### **Exemplos de Uso**

```bash
# Relatório completo com todos os gráficos
GET /dashboard/reports?type=full&details=true&charts=revenueGrowth,bestProducts,expensesBreakdown,hourlyAnalysis

# Relatório diário com gráfico de crescimento de receita
GET /dashboard/reports?type=daily&startDate=2025-09-13&charts=revenueGrowth

# Relatório semanal com análise por horário
GET /dashboard/reports?type=weekly&startDate=2025-09-13&charts=hourlyAnalysis
```

### 📈 Tipos de Relatórios

#### **1. Full (Completo)**

- **Período**: Todos os caixas registrados
- **Uso**: Análise histórica completa
- **Dados**: Todos os caixas sem filtro de data

#### **2. Daily (Diário)**

- **Período**: 24 horas a partir da data informada
- **Uso**: Análise do movimento diário
- **Dados**: Caixas abertos no dia especificado

#### **3. Weekly (Semanal)**

- **Período**: 7 dias a partir da data informada
- **Uso**: Análise de tendências semanais
- **Dados**: Caixas abertos na semana especificada

#### **4. Monthly (Mensal)**

- **Período**: 30 dias a partir da data informada
- **Uso**: Análise de performance mensal
- **Dados**: Caixas abertos no mês especificado

### 📊 Gráficos Disponíveis

#### **1. revenueGrowth (Crescimento de Receita)**

- **Tipo**: Gráfico de linha
- **Descrição**: Mostra o crescimento de lucro dividido em 6 grupos de caixas
- **Dados**: Lucro total por grupo (valor final - valor inicial)
- **Uso**: `charts=revenueGrowth`

#### **2. bestProducts (Produtos Mais Vendidos)**

- **Tipo**: Gráfico de rosca (doughnut)
- **Descrição**: Top 5 produtos mais vendidos
- **Dados**: Quantidade vendida por produto
- **Uso**: `charts=bestProducts`

#### **3. expensesBreakdown (Comparação de Saídas)**

- **Tipo**: Gráfico de pizza (pie)
- **Descrição**: Distribuição entre veículos, produtos e gastos
- **Dados**: Número de transações por categoria
- **Uso**: `charts=expensesBreakdown`

#### **4. hourlyAnalysis (Análise por Horário)**

- **Tipo**: Gráfico de barras
- **Descrição**: Movimento de veículos por período do dia
- **Períodos**:
  - 🌅 **Manhã**: 9h às 12h
  - ☀️ **Tarde**: 12h às 15h
  - 🌆 **Noite**: 15h às 18h
- **Uso**: `charts=hourlyAnalysis`

### 📋 Estrutura do Relatório PDF

#### **1. Resumo Executivo**

- **Cards de Resumo**: 6 cards com métricas principais
- **Tabela de Detalhes dos Caixas**: Resumo por caixa com totais
- **Métricas**:
  - Valor inicial total
  - Valor final total
  - Total de transações de veículos
  - Total de transações de produtos
  - Total de despesas
  - Número de caixas

#### **2. Gráficos e Análises**

- **Gráficos Dinâmicos**: Gerados via QuickChart API
- **Descrições Explicativas**: Para cada gráfico
- **Tabelas de Resumo**: Dados numéricos dos gráficos
- **Cores Distintas**: Cada gráfico tem sua paleta de cores

#### **3. Detalhes por Caixa**

- **Informações do Caixa**:
  - Operador
  - Data e horário de abertura
  - Data e horário de fechamento
  - Status (ABERTO/FECHADO)
- **Transações Detalhadas**:
  - **Veículos**: Placa, valor, método de pagamento, horário
  - **Produtos**: Nome, quantidade, valor, método de pagamento
  - **Despesas**: Descrição, valor, método de pagamento
- **Paginação**: Cada caixa em página separada

### 🔧 Configuração Técnica

#### **Dependências**

```json
{
  "pdfkit": "^0.13.0",
  "axios": "^1.6.0",
  "luxon": "^3.4.0"
}
```

#### **Arquivos Principais**

- `src/controllers/dashboardController.js` - Controlador dos relatórios
- `src/services/dashboardService.js` - Lógica de negócio
- `src/utils/dashboardReportPDF.js` - Geração do PDF
- `src/graphics/` - Cálculos e geração de gráficos

#### **APIs Externas**

- **QuickChart**: Geração de gráficos dinâmicos
- **URL**: `https://quickchart.io/chart`

### 🚀 Exemplos de Teste

#### **Teste Completo**

```bash
curl -X GET "http://localhost:3000/dashboard/reports?type=full&details=true&charts=revenueGrowth,bestProducts,expensesBreakdown,hourlyAnalysis" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -o relatorio-completo.pdf
```

#### **Teste com Gráfico Específico**

```bash
curl -X GET "http://localhost:3000/dashboard/reports?type=daily&startDate=2025-09-13&charts=hourlyAnalysis" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -o relatorio-horario.pdf
```

### 📝 Notas Importantes

1. **Autenticação**: Todos os endpoints requerem token JWT válido
2. **Formato de Data**: Use formato ISO (YYYY-MM-DD) para `startDate`
3. **Gráficos**: Podem ser combinados usando vírgula: `charts=revenueGrowth,hourlyAnalysis`
4. **PDF**: Retornado como base64 string no response
5. **Performance**: Relatórios com `details=true` são mais pesados
6. **Horários**: Análise por horário considera apenas período de funcionamento (9h-18h)

### 🔍 Troubleshooting

#### **Problemas Comuns**

- **Erro 401**: Token de autenticação inválido ou expirado
- **Erro 400**: Parâmetros de query inválidos
- **Erro 500**: Problema interno do servidor

#### **Logs de Debug**

O sistema gera logs detalhados para facilitar o debug:

```javascript
console.log("[getReportService] Iniciando relatório...");
console.log("[getReportService] Caixas encontrados:", cashRegisters.length);
console.log("📊 Calculando análise por horário...");
```

### 📞 Suporte

Para dúvidas ou problemas com o sistema de relatórios, consulte:

- Logs do servidor
- Documentação da API
- Testes em `http/dashboard/`

---

**Desenvolvido com ❤️ para gestão eficiente de estacionamentos**
