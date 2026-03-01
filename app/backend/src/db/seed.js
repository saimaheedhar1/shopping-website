const { pool } = require('./connection');

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Schema
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        price       NUMERIC(10,2) NOT NULL,
        image_url   TEXT,
        category    VARCHAR(100),
        stock       INTEGER DEFAULT 0,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        items       JSONB NOT NULL,
        total       NUMERIC(10,2) NOT NULL,
        email       VARCHAR(255) NOT NULL,
        status      VARCHAR(50) DEFAULT 'pending',
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed products
    await client.query('TRUNCATE products RESTART IDENTITY CASCADE');
    await client.query(`
      INSERT INTO products (name, description, price, image_url, category, stock) VALUES
        ('Wireless Headphones', 'Premium noise-cancelling headphones with 30h battery', 79.99,
         'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400', 'Electronics', 50),
        ('Running Sneakers', 'Lightweight mesh sneakers for long-distance running', 59.99,
         'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400', 'Footwear', 100),
        ('Leather Backpack', 'Full-grain leather backpack with 15" laptop compartment', 129.99,
         'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', 'Bags', 30),
        ('Smart Watch', 'Health tracking smartwatch with AMOLED display', 149.99,
         'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400', 'Electronics', 75),
        ('Sunglasses', 'UV400 polarised sunglasses with titanium frame', 89.99,
         'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400', 'Accessories', 60),
        ('Coffee Maker', '12-cup programmable drip coffee maker', 49.99,
         'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400', 'Kitchen', 40),
        ('Yoga Mat', 'Non-slip 6mm thick eco-friendly yoga mat', 34.99,
         'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=400', 'Sports', 80),
        ('Desk Lamp', 'LED desk lamp with wireless charging base', 44.99,
         'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=400', 'Home Office', 55)
    `);

    await client.query('COMMIT');
    console.log('Database seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
