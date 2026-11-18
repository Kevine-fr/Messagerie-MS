// Épreuves de la passerelle : authentification, CORS, routes internes,
// métriques et service en aval indisponible (aucun service réel lancé).
process.env.JWT_SECRET = 'secret-de-test';
process.env.CORS_ORIGIN = 'https://messagerie.exemple.fr';
// Ports fermés : le proxy doit répondre 502, pas planter.
process.env.USER_SERVICE_URL = 'http://127.0.0.1:9';
process.env.MESSAGE_SERVICE_URL = 'http://127.0.0.1:9';

const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app } = require('../index');

const jeton = jwt.sign({ id: 1 }, 'secret-de-test', { algorithm: 'HS256' });

test('accueil', async () => {
  await request(app).get('/').expect(200);
});

test('route privée sans jeton : 401', async () => {
  await request(app).get('/service/message/messages').expect(401);
});

test('jeton signé avec un autre secret : 403', async () => {
  const faux = jwt.sign({ id: 1 }, 'autre-secret');
  await request(app).get('/service/message/messages').set('Authorization', `Bearer ${faux}`).expect(403);
});

test('jeton « alg: none » refusé', async () => {
  const sansSignature = jwt.sign({ id: 1 }, null, { algorithm: 'none' });
  await request(app).get('/service/message/messages').set('Authorization', `Bearer ${sansSignature}`).expect(403);
});

test('suppression en masse refusée même connecté (vidait toute la messagerie)', async () => {
  for (const chemin of ['/service/message/messages', '/service/message/messages/', '/service/message/user']) {
    await request(app).delete(chemin).set('Authorization', `Bearer ${jeton}`).expect(403);
  }
});

test('suppression d’un seul message : transmise au service (ici injoignable : 502)', async () => {
  await request(app)
    .delete('/service/message/messages/abc')
    .set('Authorization', `Bearer ${jeton}`)
    .expect(502);
});

test('CORS : origine autorisée reconnue, autre origine sans en-tête', async () => {
  const ok = await request(app).options('/service/user/public/login').set('Origin', 'https://messagerie.exemple.fr');
  assert.strictEqual(ok.headers['access-control-allow-origin'], 'https://messagerie.exemple.fr');
  const ko = await request(app).get('/').set('Origin', 'https://pirate.exemple');
  assert.strictEqual(ko.headers['access-control-allow-origin'], undefined);
});

test('métriques Prometheus avec le modèle de route', async () => {
  await request(app).get('/service/message/messages');
  const rep = await request(app).get('/metrics').expect(200);
  assert.match(rep.text, /http_requests_total\{method="GET",route="\/service\/message",status_code="401"\}/);
  assert.match(rep.text, /http_request_duration_seconds_bucket/);
});
