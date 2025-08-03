const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');

// Carrega o arquivo de ambiente apropriado
const envPath = process.env.NODE_ENV === 'production'
    ? '.env'
    : '.env.local';

dotenv.config({ path: path.resolve(__dirname, envPath) });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'public', 'img', 'ico')));

// Rota inicial
app.get('/', (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        res.send('Bem-vindo à API em produção! 🚀');
    } else {
        res.send('API rodando localmente com sucesso! 🧪');
    }
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
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
    });
}

// 🟦 Exporta para Vercel
module.exports = app;
