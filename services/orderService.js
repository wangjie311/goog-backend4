const { pool } = require('../config/database');

async function createOrder(categoryId, quantity, price, deliveryKey, orderNo) {
  const query = `INSERT INTO orders (order_no, category_id, quantity, price, delivery_key)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`;
  const values = [orderNo, categoryId, quantity, price, deliveryKey];
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function markOrderPaid(orderNo) {
  const query = `UPDATE orders SET status='completed', paid_at=NOW() WHERE order_no=$1 RETURNING *`;
  const result = await pool.query(query, [orderNo]);
  return result.rows[0];
}

async function getOrder(orderNo) {
  const result = await pool.query('SELECT * FROM orders WHERE order_no=$1', [orderNo]);
  return result.rows[0];
}

module.exports = { createOrder, markOrderPaid, getOrder };
