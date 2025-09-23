const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
const cron = require("node-cron");

// Carrega o arquivo de ambiente apropriado
const envPath = process.env.NODE_ENV === 'production'
  ? '.env'
  : '.env.local';

dotenv.config({ path: path.resolve(__dirname, envPath) });

// DATABASE_URL já está definida no arquivo de ambiente apropriado
// Não precisa de lógica adicional - o dotenv já carregou a URL correta

// Log da configuração do banco de dados
console.log('🗄️  Configuração do Banco de Dados:');
console.log(`   Ambiente: ${process.env.NODE_ENV || 'development'}`);
console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Configurada' : '❌ Não configurada'}`);
if (process.env.DATABASE_URL) {
  // Mostra apenas o host e database para não expor credenciais
  try {
    const url = new URL(process.env.DATABASE_URL);
    console.log(`   Host: ${url.hostname}:${url.port || '5432'}`);
    console.log(`   Database: ${url.pathname.substring(1)}`);
    console.log(`   Usuário: ${url.username}`);
  } catch (error) {
    console.log(`   URL: ${process.env.DATABASE_URL.substring(0, 20)}...`);
  }
}
console.log('');

// Configuração do ambiente
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '4.5mb' }));
app.use(express.static(path.join(__dirname, 'src', 'public', 'img', 'ico')));

// Rota inicial com informações do ambiente
app.get('/', (req, res) => {
  const isProduction = NODE_ENV === 'production';

  // Informações do banco de dados
  let databaseInfo = {
    configured: !!process.env.DATABASE_URL,
    url: 'Não configurada'
  };

  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      databaseInfo = {
        configured: true,
        host: `${url.hostname}:${url.port || '5432'}`,
        database: url.pathname.substring(1),
        username: url.username,
        url: `${url.protocol}//${url.hostname}:${url.port || '5432'}/${url.pathname.substring(1)}`
      };
    } catch (error) {
      databaseInfo = {
        configured: true,
        url: 'URL configurada (formato inválido)'
      };
    }
  }

  const environmentInfo = {
    environment: NODE_ENV,
    isProduction: isProduction,
    message: isProduction
      ? '🚀 API de Estacionamento - PRODUÇÃO'
      : '🧪 API de Estacionamento - DESENVOLVIMENTO',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: databaseInfo,
    endpoints: {
      health: '/health',
      status: '/status',
      users: '/users',
      vehicles: '/vehicles',
      parking: '/parking',
      cash: '/cash',
      products: '/products',
      dashboard: '/dashboard',
      expense: '/expense'
    }
  };

  res.json(environmentInfo);
});

// Rota de health check melhorada
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    isProduction: NODE_ENV === 'production',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// Rota de status detalhado
app.get('/status', (req, res) => {
  res.json({
    service: 'API Estacionamento',
    environment: NODE_ENV,
    isProduction: NODE_ENV === 'production',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    version: '1.0.0',
    endpoints: [
      '/users',
      '/vehicles',
      '/parking',
      '/cash',
      '/products',
      '/dashboard',
      '/expense'
    ]
  });
});

// Rotas da API
//Rotas de usuarios
const authRoutes = require('./src/routes/usersRoutes');
//Rotas de veículos
const vehicleRoutes = require('./src/routes/vehicleRoutes');
//Rotas de estacionamento
const parkingRoutes = require('./src/routes/parkingRoutes');
//Rotas de despesas
const expenseRoutes = require('./src/routes/expenseRoutes');
//Rotas de caixa
const cashRoutes = require('./src/routes/cashRoutes');
//Rotas de produtos
const productRoutes = require('./src/routes/productRoutes');
//Rotas de dashboard
const dashboardRoutes = require('./src/routes/dashboardRoutes');

const jobs = require('./src/jobs/jobRoute')

app.use('/users', authRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/parking', parkingRoutes);
app.use('/cash', cashRoutes);
app.use('/products', productRoutes);
app.use('/dashboard', dashboardRoutes)
app.use('/expense', expenseRoutes);
app.use('/jobs', jobs)

// 🟩 Rodar localmente
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    const isProduction = NODE_ENV === 'production';
    const environment = isProduction ? '🚀 PRODUÇÃO' : '🧪 DESENVOLVIMENTO';

    console.log('='.repeat(60));
    console.log(`📡 API de Estacionamento - ${environment}`);
    console.log('='.repeat(60));
    console.log(`🌐 Servidor rodando em: http://0.0.0.0:${PORT}`);
    console.log(`🔧 Ambiente: ${NODE_ENV}`);
    console.log(`⏰ Iniciado em: ${new Date().toLocaleString('pt-BR')}`);
    console.log(`📊 Health Check: http://0.0.0.0:${PORT}/health`);
    console.log(`📈 Status Detalhado: http://0.0.0.0:${PORT}/status`);


    // Log do banco de dados na inicialização
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        console.log(`🗄️  Banco: ${url.hostname}:${url.port || '5432'}/${url.pathname.substring(1)}`);
      } catch (error) {
        console.log(`🗄️  Banco: Configurado (URL válida)`);
      }
    } else {
      console.log(`🗄️  Banco: ❌ Não configurado`);
    }

    console.log('='.repeat(60));

    if (isProduction) {
      console.log('⚠️  ATENÇÃO: API rodando em modo PRODUÇÃO');
    } else {
      console.log('💡 Dica: Use NODE_ENV=production para modo produção');
    }
    console.log('='.repeat(60));
  });
}

// 🟦 Exporta para Vercel
module.exports = app;
