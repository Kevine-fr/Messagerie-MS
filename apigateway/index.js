const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

const userService = process.env.USER_SERVICE_URL || 'http://user:8000';
const messageService = process.env.MESSAGE_SERVICE_URL || 'http://message:3000';
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret';

// Liste blanche d'origines, separees par des virgules.
// Ex: "https://messagerie-9fe8b.web.app,http://localhost:5173"
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAllOrigins = allowedOrigins.includes('*');

// CORS gere UNIQUEMENT ici (couche unique pour tout le systeme).
const corsOptions = {
  origin(origin, callback) {
    // Requetes sans origine (curl, serveur-a-serveur, health checks) -> autorisees.
    if (!origin || allowAllOrigins || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origine non autorisee par CORS : ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type'],
  // credentials est incompatible avec l'origine '*'.
  credentials: !allowAllOrigins,
};

// Le middleware cors() gere aussi automatiquement le preflight OPTIONS.
app.use(cors(corsOptions));

// Metriques Prometheus. Montees avant les proxys pour mesurer tout le trafic
// qui traverse la passerelle (y compris les 401/403 d'authentification).
// L'endpoint /metrics est bloque publiquement par nginx : seul Prometheus le
// lit, depuis le reseau Docker interne.
const { metricsMiddleware, metricsHandler } = require('./metrics');
app.use(metricsMiddleware);
app.get('/metrics', metricsHandler);

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Token via header Authorization OU query ?token= (handshake WebSocket cote navigateur).
  const token = authHeader?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ message: 'Token manquant' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });
    req.user = user;
    next();
  });
}

// Supprime tout en-tete CORS provenant des services en aval pour eviter les doublons
// (sinon le navigateur rejette : "Access-Control-Allow-Origin contains multiple values").
function stripUpstreamCors(proxyRes) {
  delete proxyRes.headers['access-control-allow-origin'];
  delete proxyRes.headers['access-control-allow-methods'];
  delete proxyRes.headers['access-control-allow-headers'];
  delete proxyRes.headers['access-control-allow-credentials'];
  delete proxyRes.headers['access-control-expose-headers'];
  delete proxyRes.headers['access-control-max-age'];
}

function createServiceProxy(target, pathPrefix, extraOptions = {}) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^${pathPrefix}`]: '' },
    onProxyRes: stripUpstreamCors,
    onError(err, req, res) {
      console.error(`Erreur proxy vers ${target} :`, err.message);
      if (res && !res.headersSent && typeof res.status === 'function') {
        res.status(502).json({ message: 'Service indisponible' });
      }
    },
    ...extraOptions,
  });
}

// USER SERVICE
app.use('/service/user/public', createServiceProxy(userService, '/service/user/public'));
app.use('/service/user/private', authenticateToken, createServiceProxy(userService, '/service/user/private'));

// MESSAGE SERVICE (REST + WebSocket / Socket.IO)
const messageProxy = createServiceProxy(messageService, '/service/message', { ws: true });
app.use('/service/message', authenticateToken, messageProxy);

app.get('/', (req, res) => res.send('API Gateway operationnelle ✅'));

const server = app.listen(PORT, () => console.log(`API Gateway en ligne sur http://0.0.0.0:${PORT}`));

// Upgrade WebSocket -> proxifie vers le service message.
server.on('upgrade', (req, socket, head) => {
  messageProxy.upgrade(req, socket, head);
});
