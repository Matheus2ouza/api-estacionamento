# Sistema de Cálculo de Cobrança - Estacionamento

Este documento explica como funciona o sistema de cálculo de valores para cobrança de estacionamento.

## Visão Geral

O sistema suporta três tipos de métodos de cobrança:

- **VALOR_FIXO**: Valor fixo independente do tempo
- **POR_HORA**: Cobrança por hora
- **POR_MINUTO**: Cobrança por minuto

## Como Funciona o Cálculo

### 1. Cálculo do Tempo de Permanência

```javascript
const stayTimeMinutes = Math.floor(now.diff(entry, "minutes").minutes);
```

- Calcula a diferença entre o tempo atual e o tempo de entrada
- Converte para minutos e arredonda para baixo (remove segundos)

### 2. Aplicação da Tolerância

A tolerância é aplicada **a cada bloco de tempo**, não apenas no primeiro. Isso significa que cada período de cobrança tem sua própria tolerância.

### 3. Tipos de Cobrança

#### VALOR_FIXO

```javascript
if (billingMethod.timeMinutes === 0) {
  finalAmount = baseValue;
}
```

- Cobra sempre o valor base (carro ou moto)
- Independente do tempo de permanência

#### POR_HORA/POR_MINUTO

```javascript
while (remainingTime > 0) {
  timeUnitsUsed++;
  remainingTime = Math.max(0, remainingTime - timeUnit - tolerance);
}
```

## Exemplos Práticos

### Configuração de Exemplo

- **Cobrança**: R$ 10,00 por 10 minutos
- **Tolerância**: 2 minutos
- **Categoria**: Carro

### Cenários de Cobrança

| Tempo (min) | Cálculo                                                                                                                   | Blocos | Valor    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------- | ------ | -------- |
| 11          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 11-12 = -1min                                              | 1      | R$ 10,00 |
| 13          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 13-12 = 1min<br>2º bloco: 1min + 2min tolerância = 3min    | 1      | R$ 10,00 |
| 25          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 25-12 = 13min<br>2º bloco: 13min + 2min tolerância = 15min | 1      | R$ 10,00 |
| 35          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 35-12 = 23min<br>2º bloco: 23min + 2min tolerância = 25min | 1      | R$ 10,00 |
| 45          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 45-12 = 33min<br>2º bloco: 33min + 2min tolerância = 35min | 1      | R$ 10,00 |
| 55          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 55-12 = 43min<br>2º bloco: 43min + 2min tolerância = 45min | 1      | R$ 10,00 |
| 65          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 65-12 = 53min<br>2º bloco: 53min + 2min tolerância = 55min | 1      | R$ 10,00 |
| 75          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 75-12 = 63min<br>2º bloco: 63min + 2min tolerância = 65min | 1      | R$ 10,00 |
| 85          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 85-12 = 73min<br>2º bloco: 73min + 2min tolerância = 75min | 1      | R$ 10,00 |
| 95          | 1º bloco: 0-10min + 2min tolerância = 12min<br>Tempo restante: 95-12 = 83min<br>2º bloco: 83min + 2min tolerância = 85min | 1      | R$ 10,00 |

## Regra de Negócio

**A tolerância é aplicada a cada bloco de tempo**, não apenas no primeiro. Isso significa:

1. **Primeiro bloco**: 0 até (tempo_unitário + tolerância)
2. **Segundo bloco**: Só inicia quando o tempo restante for maior que (tempo_unitário + tolerância)
3. **Terceiro bloco**: Só inicia quando o tempo restante for maior que (tempo_unitário + tolerância)

## Fórmula Matemática

Para um método de cobrança com:

- **Tempo unitário**: T minutos
- **Tolerância**: P minutos
- **Tempo de permanência**: S minutos

O número de blocos cobrados é calculado por:

```
blocos = 0
tempo_restante = S

enquanto tempo_restante > 0:
    blocos = blocos + 1
    tempo_restante = max(0, tempo_restante - T - P)

valor_final = blocos × valor_base
```

## Valores de Retorno

O sistema sempre retorna valores com **duas casas decimais**:

- `10.0` → `10.00`
- `15.5` → `15.50`
- `7.123` → `7.12`

## API Endpoint

**GET** `/vehicle/:vehicleId/:plateId/calculate-outstanding`

**Resposta de Sucesso:**

```json
{
  "success": true,
  "amount": 10.0
}
```

**Resposta de Erro (tempo inválido):**

```json
{
  "success": false,
  "message": "Tempo de permanência inválido. Verifique a data de entrada."
}
```

**Resposta de Erro (tempo insuficiente):**

```json
{
  "success": false,
  "message": "Tempo de permanência insuficiente para cobrança. Mínimo de 11 minutos (tolerância: 10 min)."
}
```

## Validações

O sistema inclui as seguintes validações:

### Tempo de Permanência

- **Tempo negativo**: Se a data de entrada for maior que a data atual, retorna erro
- **Mensagem**: "Tempo de permanência inválido. Verifique a data de entrada."

- **Tempo insuficiente**: Para métodos baseados em tempo (POR_HORA/POR_MINUTO), se o tempo for menor ou igual à tolerância, retorna erro
- **Mensagem**: "Tempo de permanência insuficiente para cobrança. Mínimo de X minutos (tolerância: Y min)."
- **Nota**: Para VALOR_FIXO, esta validação não se aplica, pois o valor é cobrado independente do tempo

### Método de Cobrança

- **Método ausente**: Se o veículo não possuir método de cobrança associado
- **Mensagem**: "Veículo não possui método de cobrança associado."

## Considerações Técnicas

- O cálculo é feito no fuso horário de Belém (America/Belem)
- O tempo é sempre arredondado para baixo (remove segundos)
- A tolerância é opcional (padrão: 0 minutos)
- Valores são sempre formatados com 2 casas decimais
