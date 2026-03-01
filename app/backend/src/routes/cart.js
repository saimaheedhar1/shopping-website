/**
 * In-memory cart store keyed by session ID.
 * For production swap with Redis or DB-backed sessions.
 */
const { Router } = require('express');
const { query } = require('../db/connection');

const router = Router();
const carts = {};

function getCart(sessionId) {
  return carts[sessionId] || (carts[sessionId] = []);
}

// GET /api/cart
router.get('/', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  res.json(getCart(sessionId));
});

// POST /api/cart  { productId, quantity }
router.post('/', async (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  const { productId, quantity = 1 } = req.body;

  if (!productId) return res.status(400).json({ error: 'productId required' });

  const { rows } = await query('SELECT * FROM products WHERE id = $1', [productId]);
  if (!rows.length) return res.status(404).json({ error: 'Product not found' });

  const product = rows[0];
  const cart = getCart(sessionId);
  const existing = cart.find((i) => i.productId === productId);

  if (existing) {
    existing.quantity += parseInt(quantity, 10);
  } else {
    cart.push({
      productId,
      quantity:  parseInt(quantity, 10),
      name:      product.name,
      price:     parseFloat(product.price),
      image_url: product.image_url,
    });
  }

  res.status(201).json(cart);
});

// PATCH /api/cart/:productId  { quantity }
router.patch('/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  const { quantity } = req.body;
  const cart = getCart(sessionId);
  const item = cart.find((i) => i.productId === parseInt(req.params.productId, 10));

  if (!item) return res.status(404).json({ error: 'Item not in cart' });

  if (parseInt(quantity, 10) <= 0) {
    const idx = cart.indexOf(item);
    cart.splice(idx, 1);
  } else {
    item.quantity = parseInt(quantity, 10);
  }

  res.json(cart);
});

// DELETE /api/cart/:productId
router.delete('/:productId', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  const cart = getCart(sessionId);
  const idx = cart.findIndex((i) => String(i.productId) === req.params.productId);

  if (idx === -1) return res.status(404).json({ error: 'Item not in cart' });
  cart.splice(idx, 1);
  res.json(cart);
});

// DELETE /api/cart
router.delete('/', (req, res) => {
  const sessionId = req.headers['x-session-id'] || 'default';
  carts[sessionId] = [];
  res.json([]);
});

module.exports = router;
