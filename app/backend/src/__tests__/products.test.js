const request = require('supertest');
const app     = require('../server');

// Mock DB calls
jest.mock('../db/connection', () => ({
  query: jest.fn(),
}));

const { query } = require('../db/connection');

describe('GET /api/products', () => {
  it('returns paginated products', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Hat', price: '9.99' }] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] });

    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });
});

describe('GET /api/products/:id', () => {
  it('returns a single product', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1, name: 'Hat' }] });
    const res = await request(app).get('/api/products/1');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Hat');
  });

  it('returns 404 when not found', async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/products/99');
    expect(res.status).toBe(404);
  });
});

describe('GET /health', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
