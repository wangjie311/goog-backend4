// config/bluesky-config.js
// 蓝鲸支付配置文件

module.exports = {
  // 🔧 蓝鲸支付配置 - 请根据实际情况修改
  BLUESKY_CONFIG: {
    mchId: process.env.BLUESKY_MCH_ID || "你的商户号",  // 商户号
    key: process.env.BLUESKY_KEY || "你的密钥",        // 商户密钥
    notifyUrl: process.env.BLUESKY_NOTIFY_URL || "http://localhost:5000/api/payments/callback", // 回调地址
    apiUrl: process.env.BLUESKY_API_URL || "https://pay.lanqinqifu.com/gateway/pay", // 支付网关地址
    queryUrl: process.env.BLUESKY_QUERY_URL || "https://pay.lanqinqifu.com/gateway/query" // 查询接口地址
  },

  // 💰 支付类型配置
  PAY_TYPES: {
    WECHAT: "wechat",
    ALIPAY: "alipay",
    QQ: "qq",
    UNION: "union"
  },

  // 📋 订单状态
  ORDER_STATUS: {
    PENDING: "pending",     // 待支付
    PAID: "paid",          // 已支付
    FAILED: "failed",      // 支付失败
    CANCELLED: "cancelled", // 已取消
    REFUNDED: "refunded"   // 已退款
  }
};
