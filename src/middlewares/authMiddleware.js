const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const Roles = Object.freeze({
  NORMAL: 'NORMAL',
  ADMIN: 'ADMIN'
});

const roleHierarchy = Object.freeze({
  [Roles.NORMAL]: 1,
  [Roles.ADMIN]: 2
});

function authMiddleware(minRole = Roles.NORMAL) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token ausente' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;

      const user = await prisma.account.findUnique({
        where: { id: userId },
        select: { id: true, username: true, role: true }
      });

      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      // Verifica se a role do banco é válida
      if (!roleHierarchy.hasOwnProperty(user.role)) {
        return res.status(403).json({ error: 'Role inválida no banco de dados' });
      }

      const userRoleLevel = roleHierarchy[user.role];
      const requiredRoleLevel = roleHierarchy[minRole];

      if (userRoleLevel < requiredRoleLevel) {
        return res.status(403).json({ error: 'Acesso negado: permissão insuficiente' });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error('[authMiddleware] Erro na autenticação:', err);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  };
}

module.exports = authMiddleware;
