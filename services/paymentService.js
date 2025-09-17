const { md5 } = require('../utils/paymentUtils');
const SECRET = process.env.PAYMENT_SECRET_KEY;

function verifyCallback(params) {
  const { payId, param, type, price, reallyPrice, sign } = params;
  const calcSign = md5(payId + param + type + price + reallyPrice + SECRET);
  return calcSign === sign;
}

module.exports = { verifyCallback };
