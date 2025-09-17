# 📊 API de Gráficos de Metas - Sistema de Estacionamento

Este documento explica como utilizar a rota para gerar dados de gráficos relacionados às metas do sistema de estacionamento.

## 🎯 Visão Geral

A rota `/dashboard/goals/charts` permite obter dados processados para visualização de gráficos relacionados ao progresso das metas configuradas no sistema. Os dados são calculados baseados no período da meta (diária, semanal ou mensal) e consideram apenas dias úteis (segunda a sexta-feira).

## 🔗 Endpoint

```
GET /dashboard/goals/charts
```

### Seleção de gráficos via `charts`

- Você escolhe exatamente quais gráficos quer que o backend processe passando-os em `charts` (separados por vírgula). Não é obrigatório solicitar todos.
- Exemplos:
  - `charts=goalProgress`
  - `charts=weeklyProfit`
  - `charts=goalProgress,weeklyProfit`

### Regras por período (níveis)

Mesmo escolhendo via `charts`, cada período só permite certos gráficos. Se algum gráfico não for permitido para o período, ele é ignorado (o backend registra um aviso e segue com os demais):

- DIARIA: permite `goalProgress`.
- SEMANAL: permite `goalProgress`, `weeklyProfit`, `totalsBarGroup`, `dailyTotals`.
- MENSAL: permite `goalProgress`, `weeklyProfit`, `totalsBarGroup`, `dailyTotals`.

## 🔐 Autenticação

- **Nível de acesso**: `MANAGER` ou superior
- **Middleware**: `authMiddleware("MANAGER")`

## 📋 Parâmetros de Query

### Obrigatórios

| Parâmetro    | Tipo   | Valores Aceitos                                                 | Descrição                                                        |
| ------------ | ------ | --------------------------------------------------------------- | ---------------------------------------------------------------- |
| `goalPeriod` | string | `DIARIA`, `SEMANAL`, `MENSAL`                                   | Período da meta para cálculo dos dados                           |
| `charts`     | string | `goalProgress`, `weeklyProfit`, `totalsBarGroup`, `dailyTotals` | Tipo de gráfico solicitado (separado por vírgula para múltiplos) |

### Exemplo de Uso

```bash
GET /dashboard/goals/charts?goalPeriod=DIARIA&charts=goalProgress
GET /dashboard/goals/charts?goalPeriod=SEMANAL&charts=goalProgress
GET /dashboard/goals/charts?goalPeriod=MENSAL&charts=goalProgress
GET /dashboard/goals/charts?goalPeriod=SEMANAL&charts=weeklyProfit
GET /dashboard/goals/charts?goalPeriod=SEMANAL&charts=goalProgress,weeklyProfit
GET /dashboard/goals/charts?goalPeriod=SEMANAL&charts=totalsBarGroup
GET /dashboard/goals/charts?goalPeriod=MENSAL&charts=goalProgress,weeklyProfit,totalsBarGroup
```

## 📊 Tipos de Gráficos Disponíveis

### 1. `goalProgress` - Progresso da Meta

Retorna dados sobre o progresso atual em relação à meta configurada:

```json
{
  "success": true,
  "message": "Dados dos gráficos obtidos com sucesso.",
  "data": {
    "goalProgress": {
      "targetValue": 1000.0, // Valor da meta configurada
      "currentValue": 750.5, // Valor atual atingido
      "progress": 75.05 // Percentual de progresso (0-100)
    }
  }
}
```

### 2. `weeklyProfit` - Lucro Semanal (SEMANAL e MENSAL)

Retorna dados detalhados sobre o lucro diário da semana atual, mostrando apenas dias úteis que já passaram:

```json
{
  "success": true,
  "message": "Dados dos gráficos obtidos com sucesso.",
  "data": {
    "weeklyProfit": {
      "weeklyGoal": {
        "targetValue": 2000.0, // Meta semanal total
        "currentValue": 1200.5, // Valor atual atingido na semana
        "progress": 60.03, // Progresso percentual da semana
        "currentDay": 3 // Dia atual (1=segunda, 2=terça, 3=quarta, 4=quinta, 5=sexta, 0=não é dia útil)
      },
      "dailyData": [
        {
          "dayNumber": 1,
          "dayName": "Segunda",
          "profit": 250.0 // Lucro do dia
        },
        {
          "dayNumber": 2,
          "dayName": "Terça",
          "profit": 300.5 // Lucro do dia
        },
        {
          "dayNumber": 3,
          "dayName": "Quarta",
          "profit": 650.0 // Lucro do dia
        },
        {
          "dayNumber": 4,
          "dayName": "Quinta",
          "profit": 0.0 // Dia futuro - lucro zero
        },
        {
          "dayNumber": 5,
          "dayName": "Sexta",
          "profit": 0.0 // Dia futuro - lucro zero
        }
      ]
    }
  }
}
```

#### Características do `weeklyProfit`:

- **Período**: Funciona com `goalPeriod=SEMANAL` e `goalPeriod=MENSAL`
- **Dias úteis**: Mostra apenas segunda a sexta-feira
- **Dias futuros**: Dias que ainda não passaram têm lucro zero
- **Meta diária**: O frontend calcula automaticamente dividindo a meta semanal por 5
- **Dia atual**: Indica qual dia útil estamos (1-5, ou 0 se não for dia útil)

### 3. `totalsBarGroup` - Totais por Dia (SEMANAL e MENSAL)

-### 4. `dailyTotals` - Totais do Dia (DIARIA)

Retorna os totais consolidados do dia atual (nível DIARIA): `generalSaleTotal`, `vehicleEntryTotal`, `outgoingExpenseTotal`.

```json
{
  "success": true,
  "message": "Dados dos gráficos obtidos com sucesso.",
  "data": {
    "dailyTotals": {
      "period": "DIARIA",
      "totals": {
        "generalSaleTotal": 300.0,
        "vehicleEntryTotal": 420.0,
        "outgoingExpenseTotal": 50.0
      }
    }
  }
}
```

Retorna, por dia, os totais consolidados de `generalSaleTotal`, `vehicleEntryTotal`, `outgoingExpenseTotal`.

```json
{
  "success": true,
  "message": "Dados dos gráficos obtidos com sucesso.",
  "data": {
    "totalsBarGroup": {
      "period": "SEMANAL",
      "dailyTotals": [
        {
          "dayNumber": 1,
          "dayName": "Segunda",
          "generalSaleTotal": 120.0,
          "vehicleEntryTotal": 200.0,
          "outgoingExpenseTotal": 50.0
        },
        {
          "dayNumber": 2,
          "dayName": "Terça",
          "generalSaleTotal": 180.0,
          "vehicleEntryTotal": 150.0,
          "outgoingExpenseTotal": 20.0
        }
      ]
    }
  }
}
```

Regras:

- **SEMANAL**: lista de segunda até o dia útil atual (apenas dias úteis já passados)
- **MENSAL**: retorna os últimos 5 dias úteis do mês atual (em ordem cronológica)

## 🗓️ Lógica de Períodos

### DIARIA

- **Período**: Dia atual (00:00:00 até 23:59:59)
- **Cálculo**: Receita total do dia atual

### SEMANAL

- **Período**: Segunda-feira a sexta-feira (apenas dias úteis)
- **Lógica**:
  - Se hoje é **domingo**: calcula segunda a sexta da semana anterior
  - Se hoje é **dia útil** (segunda a sexta): calcula segunda até hoje
  - Se hoje é **sábado**: calcula segunda a sexta da semana atual

### MENSAL

- **Período**: Todos os dias úteis do mês atual
- **Cálculo**: Receita total de todos os dias úteis do mês

## 💰 Cálculo da Receita

A receita é calculada como:

```
Receita = Valor Final do Caixa - Valor Inicial do Caixa
```

Para períodos **SEMANAL** e **MENSAL**, apenas caixas de dias úteis são considerados.

## 🔄 Fluxo de Processamento

1. **Validação**: Verifica se os parâmetros obrigatórios foram fornecidos
2. **Busca da Meta**: Obtém a configuração da meta para o período especificado
3. **Cálculo de Datas**: Determina o range de datas baseado no período
4. **Consulta ao Banco**: Busca caixas no período calculado
5. **Filtro de Dias Úteis**: Remove caixas de fins de semana (para SEMANAL/MENSAL)
6. **Cálculo de Progresso**: Calcula receita atual vs meta configurada
7. **Formatação**: Retorna dados estruturados para o frontend

## 📝 Exemplos de Resposta

### Sucesso

```json
{
  "success": true,
  "message": "Dados dos gráficos obtidos com sucesso.",
  "data": {
    "goalProgress": {
      "targetValue": 2000.0,
      "currentValue": 1450.75,
      "progress": 72.54
    }
  }
}
```

### Erro - Meta não encontrada

```json
{
  "success": false,
  "message": "Meta não encontrada para o período especificado."
}
```

### Erro - Parâmetros inválidos

```json
{
  "success": false,
  "message": "Dados inválidos. Verifique os campos e tente novamente."
}
```

## ⚠️ Tratamento de Erros

| Código | Situação             | Descrição                                            |
| ------ | -------------------- | ---------------------------------------------------- |
| `400`  | Parâmetros inválidos | `goalPeriod` ou `charts` não fornecidos ou inválidos |
| `404`  | Meta não encontrada  | Não existe configuração de meta para o período       |
| `500`  | Erro interno         | Erro no processamento dos dados                      |

## 🛠️ Implementação Técnica

### Arquivos Envolvidos

- **Rota**: `src/routes/dashboardRoutes.js`
- **Controller**: `src/controllers/dashboardController.js`
- **Service**: `src/services/dashboardService.js`
- **Processador de Metas**: `src/graphicsGoals/chartDataProcessors.js`
- **Processador de Lucro Semanal**: `src/graphicsGoals/weeklyProfitProcessor.js`

### Funções Principais

#### Em `chartDataProcessors.js`:

1. `getDateRangeByPeriod()` - Calcula range de datas baseado no período
2. `isWeekday()` - Verifica se uma data é dia útil
3. `processGoalProgressData()` - Processa dados para o gráfico de progresso
4. `createDateWithTime()` - Cria datas com horário específico usando formato ISO
5. `formatToTwoDecimals()` - Formata números com duas casas decimais

#### Em `weeklyProfitProcessor.js`:

1. `getWeeklyDateRange()` - Calcula range de datas da semana atual
2. `processWeeklyProfitData()` - Processa dados para o gráfico de lucro semanal
3. `createDateWithTime()` - Cria datas com horário específico usando formato ISO
4. `formatToTwoDecimals()` - Formata números com duas casas decimais
5. `isWeekday()` - Verifica se uma data é dia útil

## 🚀 Uso no Frontend

### Exemplo 1: Gráfico de Progresso Diário

```javascript
// Exemplo de chamada para gráfico de progresso diário
const response = await fetch(
  "/dashboard/goals/charts?goalPeriod=DIARIA&charts=goalProgress",
  {
    headers: {
      Authorization: "Bearer " + token,
    },
  }
);

const data = await response.json();

if (data.success) {
  const progressData = data.data.goalProgress;
  console.log(`Meta: R$ ${progressData.targetValue}`);
  console.log(`Atual: R$ ${progressData.currentValue}`);
  console.log(`Progresso: ${progressData.progress}%`);
}
```

### Exemplo 2: Gráfico de Lucro Semanal

```javascript
// Exemplo de chamada para gráfico de lucro semanal
const response = await fetch(
  "/dashboard/goals/charts?goalPeriod=SEMANAL&charts=weeklyProfit",
  {
    headers: {
      Authorization: "Bearer " + token,
    },
  }
);

const data = await response.json();

if (data.success) {
  const profitData = data.data.weeklyProfit;

  // Dados da meta semanal
  console.log(`Meta semanal: R$ ${profitData.weeklyGoal.targetValue}`);
  console.log(`Atual: R$ ${profitData.weeklyGoal.currentValue}`);
  console.log(`Progresso: ${profitData.weeklyGoal.progress}%`);
  console.log(`Dia atual: ${profitData.weeklyGoal.currentDay}`);

  // Dados diários
  profitData.dailyData.forEach((day) => {
    console.log(`${day.dayName}: R$ ${day.profit}`);
  });

  // Calcular meta diária (para o frontend)
  const dailyGoal = profitData.weeklyGoal.targetValue / 5;
  console.log(`Meta diária: R$ ${dailyGoal}`);
}
```

### Exemplo 3: Múltiplos Gráficos

```javascript
// Exemplo de chamada para múltiplos gráficos
const response = await fetch(
  "/dashboard/goals/charts?goalPeriod=SEMANAL&charts=goalProgress,weeklyProfit",
  {
    headers: {
      Authorization: "Bearer " + token,
    },
  }
);

const data = await response.json();

if (data.success) {
  // Dados de progresso
  if (data.data.goalProgress) {
    const progressData = data.data.goalProgress;
    console.log("Progresso:", progressData);
  }

  // Dados de lucro semanal
  if (data.data.weeklyProfit) {
    const profitData = data.data.weeklyProfit;
    console.log("Lucro semanal:", profitData);
  }
}
```

## 📈 Extensibilidade

Para adicionar novos tipos de gráficos:

### Opção 1: Adicionar ao arquivo existente

1. Adicione o novo tipo em `chartDataProcessors.js`
2. Implemente a função de processamento
3. Adicione o case no controller
4. Atualize a documentação

### Opção 2: Criar arquivo separado (Recomendado)

1. Crie um novo arquivo em `src/graphicsGoals/` (ex: `newChartProcessor.js`)
2. Implemente a função de processamento no novo arquivo
3. Adicione a função no service importando do novo arquivo
4. Adicione o case no controller
5. Atualize a documentação

**Exemplo de estrutura para novo processador:**

```javascript
// src/graphicsGoals/newChartProcessor.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function processNewChartData(params) {
  // Implementação aqui
}

module.exports = {
  processNewChartData,
};
```

## 🔧 Configuração de Metas

Antes de usar esta rota, certifique-se de que as metas estão configuradas através da rota:

```
POST /dashboard/goals?goalPeriod=DIARIA&goalValue=1000&isActive=true
```

---

**Desenvolvido para o Sistema de Estacionamento** 🚗
