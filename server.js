const express = require('express');
const app = express();
const path = require('path');

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'src', 'public', 'img', 'ico')));

// Rotas de abertura
app.get('/', (req, res) => {
    res.send('Bem-vindo à minha API! ❤️');
});

//Rotas
const authRoutes = require('./src/routes/authRoutes');
const vehicleRoutes = require('./src/routes/vehicleRoutes');
const cashRoutes = require('./src/routes/cashRoutes');
const productRoutes = require('./src/routes/productRoutes');

app.use('/auth', authRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/cash', cashRoutes);
app.use('/products', productRoutes);

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor rodando em http://localhost:${PORT}`);
    });
}

// Exporta para Vercel
module.exports = app;
