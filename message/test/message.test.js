// Épreuves du service message sans MongoDB : validations faites avant la
// base, aperçu des notifications, métriques par modèle de route.
const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const request = require('supertest');
const controleur = require('../controllers/messageController');
const { metricsMiddleware, metricsHandler } = require('../metrics');

function fausseReponse() {
  const res = { code: 200, corps: null };
  res.status = (c) => { res.code = c; return res; };
  res.json = (j) => { res.corps = j; return res; };
  return res;
}

test('message vide refusé (400) sans toucher la base', async () => {
  const res = fausseReponse();
  await controleur.createMessage({ body: { senderId: 1, receiverId: 2, content: '   ' } }, res);
  assert.strictEqual(res.code, 400);
});

test('message à soi-même refusé (409) avant toute lecture en base', async () => {
  const res = fausseReponse();
  await controleur.createMessage({ body: { senderId: 3, receiverId: 3, content: 'salut' } }, res);
  assert.strictEqual(res.code, 409);
});

test('aperçu des notifications push', () => {
  assert.strictEqual(controleur.previewFor('text', 'Bonjour', null), 'Bonjour');
  assert.strictEqual(controleur.previewFor('image', '', null), '📷 Photo');
  assert.strictEqual(controleur.previewFor('file', '', 'cv.pdf'), '📎 cv.pdf');
  assert.strictEqual(controleur.previewFor('inconnu', '', null), 'Nouveau message');
});

test('métriques : le modèle de route, jamais l’identifiant', async () => {
  const app = express();
  app.use(metricsMiddleware);
  app.get('/metrics', metricsHandler);
  const routeur = express.Router();
  routeur.get('/:id', (req, res) => res.status(404).end());
  app.use('/messages', routeur);

  await request(app).get('/messages/65f0c0ffee');
  await request(app).get('/introuvable');
  const texte = (await request(app).get('/metrics')).text;
  assert.match(texte, /http_requests_total\{method="GET",route="\/messages\/:id",status_code="404"\} 1/);
  assert.match(texte, /route="unmatched"/);
  assert.doesNotMatch(texte, /65f0c0ffee/);
});
