const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 8080;

const userService = process.env.USER_SERVICE_URL || 'http://user_service:8000';
const messageService = process.env.MESSAGE_SERVICE_URL || 'http://message_service:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// ✅ CORS en tout premier, avant tout autre middleware
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  credentials: true,
}));

// ✅ Répondre immédiatement aux preflight OPTIONS
app.options('*', cors());

// Middleware JWT
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

// Fonction de création de proxy
function createServiceProxy(target, pathPrefix) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${pathPrefix}`]: '' },
    onError(err, req, res) {
      console.error(`Erreur proxy vers ${target}:`, err.message);
      res.status(502).json({ message: 'Service indisponible' });
    },
  });
}

// USER SERVICE
app.use('/service/user/public', createServiceProxy(userService, '/service/user/public'));
app.use('/service/user/private', authenticateToken, createServiceProxy(userService, '/service/user/private'));

// MESSAGE SERVICE
app.use('/service/message', authenticateToken, createServiceProxy(messageService, '/service/message'));

// Route de test
app.get('/', (req, res) => res.send('API Gateway opérationnelle ✅'));

app.listen(PORT, () => console.log(`API Gateway running at http://localhost:${PORT}`));