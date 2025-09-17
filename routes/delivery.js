const express = require('express');
const router = express.Router();
const { getOrder } = require('../services/orderService');
const { getOrderCards } = require('../services/cardService');

router.get('/instant/:orderNo', async (req, res) => {
  try {
    const { orderNo } = req.params;
    const { key } = req.query;

    const order = await getOrder(orderNo);
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (order.delivery_key !== key) return res.status(403).json({ error: 'Invalid delivery key' });

    if (order.status !== 'completed') return res.status(400).json({ error: 'Order not completed' });

    const cards = await getOrderCards(order.id);
    res.json({ success: true, cards });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

module.exports = router;
