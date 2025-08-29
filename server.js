const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');

// Carrega o arquivo de ambiente apropriado
const envPath = process.env.NODE_ENV === 'production'
    ? '.env'
    : '.env.local';

dotenv.config({ path: path.resolve(__dirname, envPath) });

// Configuração do ambiente
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '4.5mb' }));
app.use(express.static(path.join(__dirname, 'src', 'public', 'img', 'ico')));

// Rota inicial com informações do ambiente
app.get('/', (req, res) => {
    const isProduction = NODE_ENV === 'production';
    const environmentInfo = {
        environment: NODE_ENV,
        isProduction: isProduction,
        message: isProduction 
            ? '🚀 API de Estacionamento - PRODUÇÃO' 
            : '🧪 API de Estacionamento - DESENVOLVIMENTO',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
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
            '/auth',
            '/vehicles', 
            '/cash',
            '/products',
            '/dashboard'
        ]
    });
});

// Rotas da API
const authRoutes = require('./src/routes/authRoutes');
const vehicleRoutes = require('./src/routes/vehicleRoutes');
const cashRoutes = require('./src/routes/cashRoutes');
const productRoutes = require('./src/routes/productRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes')

app.use('/auth', authRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/cash', cashRoutes);
app.use('/products', productRoutes);
app.use('/dashboard', dashboardRoutes)

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
