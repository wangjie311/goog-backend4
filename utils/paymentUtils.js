const crypto = require('crypto');

function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

function generateOrderNo() {
  return 'ORD-' + Date.now();
}

function generateDeliveryKey() {
  return crypto.randomBytes(16).toString('hex');
}

module.exports = { md5, generateOrderNo, generateDeliveryKey };
