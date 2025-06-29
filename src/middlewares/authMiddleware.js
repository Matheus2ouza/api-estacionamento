const jwt = require('jsonwebtoken');

function authMiddleware(roles = []) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token ausente' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Verifica se a role do usuário está permitida
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Anexa o usuário decodificado na requisição para uso posterior
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido' });
    }
  };
}

module.exports = authMiddleware;
