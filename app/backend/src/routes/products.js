const { Router } = require('express');
const { query } = require('../db/connection');

const router = Router();

// GET /api/products
router.get('/', async (req, res) => {
  const { category, search, page = 1, limit = 12 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);
  const params = [];
  const conditions = [];

  if (category) {
    params.push(category);
    conditions.push(`category = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR description ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const [dataRes, countRes] = await Promise.all([
    query(
      `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, parseInt(limit, 10), offset]
    ),
    query(`SELECT COUNT(*) FROM products ${where}`, params),
  ]);

  res.json({
    products: dataRes.rows,
    total:    parseInt(countRes.rows[0].count, 10),
    page:     parseInt(page, 10),
    pages:    Math.ceil(countRes.rows[0].count / parseInt(limit, 10)),
  });
});

// GET /api/products/categories
router.get('/categories', async (_req, res) => {
  const { rows } = await query('SELECT DISTINCT category FROM products ORDER BY category');
  res.json(rows.map((r) => r.category));
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  const { rows } = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Product not found' });
  res.json(rows[0]);
});

module.exports = router;
