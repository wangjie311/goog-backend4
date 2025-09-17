const { pool } = require('../config/database');

async function getAvailableCards(categoryId, quantity) {
  const query = `SELECT * FROM cards WHERE category_id=$1 AND is_sold=false ORDER BY id ASC LIMIT $2`;
  const result = await pool.query(query, [categoryId, quantity]);
  return result.rows;
}

async function markCardsSold(cardIds) {
  const query = `UPDATE cards SET is_sold=true WHERE id = ANY($1::int[])`;
  await pool.query(query, [cardIds]);
}

async function assignCardsToOrder(orderId, cards) {
  for (let card of cards) {
    await pool.query(`INSERT INTO order_cards (order_id, card_id) VALUES ($1, $2)`, [orderId, card.id]);
  }
}

async function getOrderCards(orderId) {
  const result = await pool.query(`SELECT c.* FROM order_cards oc JOIN cards c ON oc.card_id=c.id WHERE oc.order_id=$1`, [orderId]);
  return result.rows;
}

module.exports = { getAvailableCards, markCardsSold, assignCardsToOrder, getOrderCards };
