const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 8080;

// Services cibles
const userService = process.env.USER_SERVICE_URL || 'http://user_service:8000';
const messageService = process.env.MESSAGE_SERVICE_URL || 'http://message_service:3000';

// Clé secrète pour valider les tokens JWT (doit être la même que celle utilisée dans Laravel)
const JWT_SECRET = process.env.JWT_SECRET ?? 'BQbrDxP4WWoMDUeTaTDeEs8wSsizAulUkAEuhCkua13s5wsP0MzN6kBovKz1djtQ';

// Middleware pour vérifier le token JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Token manquant' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });

    req.user = user;
    next();
  });
}

// Proxy avec gestion d’erreurs
function createServiceProxy(target, pathPrefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
      [`^${pathPrefix}`]: '', // retire le préfixe dans le chemin
    },
    onError(err, req, res) {
      console.error(`Erreur proxy vers ${target}:`, err.message);
      res.status(502).json({ message: 'Service indisponible' });
    },
  });
}

// Routes protégées par JWT
app.use('/service/user', authenticateToken, createServiceProxy(userService, '/service/user'));
app.use('/service/message', authenticateToken, createServiceProxy(messageService, '/service/message'));

// Route test non protégée
app.get('/', (req, res) => {
  res.send('API Gateway opérationnelle ✅');
});

app.listen(PORT, () => {
  console.log(`API Gateway running at http://localhost:${PORT}`);
});
