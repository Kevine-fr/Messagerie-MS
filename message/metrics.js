/**
 * Métriques Prometheus du service Message.
 *
 * Exposées sur `GET /metrics` et lues par le Prometheus du VPS via le réseau
 * Docker « web » (`messagerie-service-message:3000`). L'endpoint est bloqué
 * côté nginx pour le public (`location = /metrics { return 404; }`).
 *
 * Mêmes noms et mêmes seaux que les autres services du VPS : comparer deux
 * applications n'a de sens que sur des séries construites à l'identique.
 */
const { Registry, collectDefaultMetrics, Counter, Histogram } = require('prom-client');

const registry = new Registry();

// Métriques runtime Node : heap, GC, event-loop lag, CPU, descripteurs.
collectDefaultMetrics({ register: registry });

const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Nombre de requêtes HTTP servies.',
  labelNames: ['method', 'route', 'status_code'],
  registers: [registry],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP, en secondes.',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

/**
 * Identifiant de route stable.
 *
 * On veut le modèle de route (`/messages/:id`), pas l'URL réelle : sinon chaque
 * identifiant de message crée une série de plus et fait exploser la mémoire de
 * Prometheus.
 */
function routeOf(req) {
  if (req.route && req.route.path) {
    const base = req.baseUrl || '';
    const path = req.route.path === '/' ? '' : req.route.path;
    return `${base}${path}` || '/';
  }
  return req.baseUrl || 'unmatched';
}

/** Middleware à monter avant les routes : mesure toutes les réponses. */
function metricsMiddleware(req, res, next) {
  if (req.path === '/metrics') return next();

  const stop = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const labels = {
      method: req.method,
      route: routeOf(req),
      status_code: String(res.statusCode),
    };
    stop(labels);
    httpRequestsTotal.inc(labels);
  });
  next();
}

/** Handler de `GET /metrics` (format texte Prometheus). */
async function metricsHandler(_req, res) {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}

module.exports = { registry, metricsMiddleware, metricsHandler };
