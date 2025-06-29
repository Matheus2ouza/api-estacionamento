const express = require('express');
const app = express();

app.use(express.json());

app.use('/favicon.ico', express.static(path.join(__dirname, 'public', 'favicon.ico')));

app.get('/', (req, res) => {
    res.send('Bem-vindo à minha API! ❤️');
});

// Exportação para a Vercel
const server = require('http').createServer(app);
module.exports = (req, res) => {
    return app(req, res); // Vercel precisa dessa função handler
};
