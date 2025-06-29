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
    console.log('[authMiddleware] Iniciando verificação de autenticação');
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(' ')[1];

    if (!token) {
      console.log('[authMiddleware] Token ausente');
      return res.status(401).json({ error: 'Token ausente' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[authMiddleware] Token decodificado:', decoded);

      const userId = decoded.id;
      console.log(`[authMiddleware] Buscando usuário no banco com id: ${userId}`);

      const user = await prisma.account.findUnique({
        where: { id: userId },
        select: { id: true, username: true, role: true }
      });

      if (!user) {
        console.log('[authMiddleware] Usuário não encontrado no banco');
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }
      console.log('[authMiddleware] Usuário encontrado:', user);

      if (!roleHierarchy.hasOwnProperty(user.role)) {
        console.log(`[authMiddleware] Role inválida no banco: ${user.role}`);
        return res.status(403).json({ error: 'Role inválida no banco de dados' });
      }

      const userRoleLevel = roleHierarchy[user.role];
      const requiredRoleLevel = roleHierarchy[minRole];
      console.log(`[authMiddleware] Role do usuário: ${user.role} (nível ${userRoleLevel})`);
      console.log(`[authMiddleware] Role mínima exigida: ${minRole} (nível ${requiredRoleLevel})`);

      if (userRoleLevel < requiredRoleLevel) {
        console.log('[authMiddleware] Permissão insuficiente');
        return res.status(403).json({ error: 'Acesso negado: permissão insuficiente' });
      }

      req.user = user;
      console.log('[authMiddleware] Autorização concedida, prosseguindo para a próxima etapa');
      next();
    } catch (err) {
      console.error('[authMiddleware] Erro na autenticação:', err);
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
  };
}

module.exports = authMiddleware;
