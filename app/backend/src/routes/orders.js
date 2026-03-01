const { Router } = require('express');
const { query } = require('../db/connection');

const router = Router();

// POST /api/orders  { items: [...], email, total }
router.post('/', async (req, res) => {
  const { items, email, total } = req.body;

  if (!items?.length) return res.status(400).json({ error: 'items required' });
  if (!email)         return res.status(400).json({ error: 'email required' });
  if (total == null)  return res.status(400).json({ error: 'total required' });

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return res.status(400).json({ error: 'Invalid email' });

  const { rows } = await query(
    'INSERT INTO orders (items, email, total) VALUES ($1, $2, $3) RETURNING *',
    [JSON.stringify(items), email, total]
  );

  res.status(201).json(rows[0]);
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Order not found' });
  res.json(rows[0]);
});

module.exports = router;
