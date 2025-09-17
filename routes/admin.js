const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { pool } = require('../config/database');

// 创建表
router.post('/migrate', auth, async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        category_id INT REFERENCES categories(id),
        code TEXT NOT NULL,
        is_sold BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_no VARCHAR(50) UNIQUE NOT NULL,
        category_id INT REFERENCES categories(id),
        quantity INT NOT NULL,
        price NUMERIC(10,2) NOT NULL,
        delivery_key VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        paid_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS order_cards (
        id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(id),
        card_id INT REFERENCES cards(id),
        assigned_at TIMESTAMP DEFAULT NOW()
      );
    `);
    res.json({ success: true, message: 'Migration completed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Migration failed' });
  }
});

// 导入卡密
router.post('/import-cards', auth, async (req, res) => {
  try {
    const { categoryId, codes } = req.body;
    for (let code of codes) {
      await pool.query('INSERT INTO cards (category_id, code) VALUES ($1, $2)', [categoryId, code]);
    }
    res.json({ success: true, message: 'Cards imported' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to import cards' });
  }
});

// 查看库存
router.get('/inventory/:categoryId', auth, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const result = await pool.query('SELECT COUNT(*) FROM cards WHERE category_id=$1 AND is_sold=false', [categoryId]);
    res.json({ success: true, available: result.rows[0].count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get inventory' });
  }
});

module.exports = router;
