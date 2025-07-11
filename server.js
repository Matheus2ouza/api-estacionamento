const express = require('express');
const app = express();
const path = require('path');

app.use(express.json());

app.use(express.static(path.join(__dirname, 'src', 'public', 'img')));

app.get('/', (req, res) => {
    res.send('Bem-vindo à minha API! ❤️');
});

const authRoutes = require('./src/routes/authRoutes');
const vehicleRoutes = require('./src/routes/vehicleRoutes');
const cashRoutes = require('./src/routes/cashRoutes')

app.use('/auth', authRoutes);
app.use('/vehicles', vehicleRoutes);
app.use('/cash', cashRoutes)

// Exportação para a Vercel
const server = require('http').createServer(app);
module.exports = (req, res) => {
    return app(req, res); // Vercel precisa dessa função handler
};
