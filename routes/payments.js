// routes/payments.js
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");
const { BLUESKY_CONFIG, PAY_TYPES, ORDER_STATUS } = require("../config/bluesky-config");

const router = express.Router();

// 🔑 生成签名函数
function createSign(params, key) {
  const sortedKeys = Object.keys(params).sort();
  let str = "";
  sortedKeys.forEach(k => {
    if (params[k] !== "" && params[k] !== undefined && k !== "sign") {
      str += `${k}=${params[k]}&`;
    }
  });
  str += `key=${key}`;
  return crypto.createHash("md5").update(str, "utf8").digest("hex").toUpperCase();
}

// 🛒 下单接口（前端调用）
router.post("/create", async (req, res) => {
  try {
    const { orderId, amount, productName, payType } = req.body; // payType: wechat / alipay

    // 参数验证
    if (!orderId || !amount || !productName || !payType) {
      return res.status(400).json({ 
        success: false, 
        msg: "缺少必要参数：orderId, amount, productName, payType" 
      });
    }

    const params = {
      mchId: BLUESKY_CONFIG.mchId,
      outTradeNo: orderId,
      totalFee: Math.round(amount * 100), // 转换为分
      body: productName,
      notifyUrl: BLUESKY_CONFIG.notifyUrl,
      payType
    };

    params.sign = createSign(params, BLUESKY_CONFIG.key);

    console.log("发送到蓝鲸支付的参数:", params);

    // 发送请求到蓝鲸支付
    const result = await axios.post(BLUESKY_CONFIG.apiUrl, params);
    console.log("蓝鲸支付返回：", result.data);

    if (result.data && result.data.code === 0) {
      res.json({
        success: true,
        payUrl: result.data.data.payUrl, // 扫码支付链接
        payId: result.data.data.payId,
        orderId: orderId
      });
    } else {
      res.status(400).json({ 
        success: false, 
        msg: result.data?.msg || "支付下单失败" 
      });
    }
  } catch (err) {
    console.error("支付下单失败:", err.message);
    res.status(500).json({ 
      success: false, 
      msg: "支付下单失败，请稍后重试" 
    });
  }
});

// 📩 支付回调（蓝鲸支付服务器调用）
router.post("/callback", express.urlencoded({ extended: false }), (req, res) => {
  const data = req.body;
  console.log("蓝鲸支付回调数据:", data);

  try {
    const sign = data.sign;
    const dataForSign = { ...data };
    delete dataForSign.sign;

    const verifySign = createSign(dataForSign, BLUESKY_CONFIG.key);
    
    if (sign !== verifySign) {
      console.error("签名验证失败:", { received: sign, expected: verifySign });
      return res.send("FAIL");
    }

    if (data.tradeStatus === "SUCCESS") {
      const orderId = data.outTradeNo;
      const transactionId = data.transactionId;
      const paidAmount = data.totalFee / 100; // 转换回元
      const paymentMethod = data.payType || 'unknown'; // 支付方式
      
      console.log(`✅ 订单 ${orderId} 支付成功，交易号: ${transactionId}，金额: ${paidAmount}元，支付方式: ${paymentMethod}`);

      // 更新数据库订单状态为已支付
      await updateOrderStatus(orderId, 'paid', transactionId, paidAmount, paymentMethod, data);

      res.send("SUCCESS");
    } else {
      console.log(`订单 ${data.outTradeNo} 支付状态: ${data.tradeStatus}`);
      res.send("FAIL");
    }
  } catch (error) {
    console.error("处理支付回调时出错:", error);
    res.send("FAIL");
  }
});

// 🔍 查询订单支付状态
router.get("/status/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const params = {
      mchId: BLUESKY_CONFIG.mchId,
      outTradeNo: orderId
    };
    
    params.sign = createSign(params, BLUESKY_CONFIG.key);
    
    // 这里应该调用蓝鲸支付的查询接口
    // const result = await axios.post(BLUESKY_QUERY_URL, params);
    
    // 临时返回，实际应该查询数据库或调用蓝鲸支付查询接口
    res.json({
      success: true,
      orderId: orderId,
      status: 'pending' // pending, paid, failed
    });
  } catch (error) {
    console.error("查询支付状态失败:", error);
    res.status(500).json({
      success: false,
      msg: "查询支付状态失败"
    });
  }
});

// 更新订单状态的函数（PostgreSQL实现）
async function updateOrderStatus(orderId, status, transactionId, paidAmount, paymentMethod = 'unknown', callbackData = {}) {
  const { pool } = require("../config/database");
  
  try {
    // 将状态映射到数据库中的状态
    const dbStatus = status === 'paid' ? 'completed' : status;
    
    // 更新订单状态（包含支付信息）
    const updateQuery = `
      UPDATE orders 
      SET status = $1, 
          paid_at = NOW(),
          transaction_id = $2,
          paid_amount = $3,
          payment_method = $4
      WHERE order_no = $5 
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, [dbStatus, transactionId, paidAmount, paymentMethod, orderId]);
    
    if (result.rows.length > 0) {
      console.log(`✅ 订单状态更新成功: ${orderId} -> ${dbStatus}`);
      console.log(`💰 支付金额: ${paidAmount}元, 交易号: ${transactionId}, 支付方式: ${paymentMethod}`);
      
      // 记录支付日志
      await logPayment(orderId, paymentMethod, paidAmount, transactionId, status, callbackData);
      
      // 如果是已支付状态，可以触发发货逻辑
      if (status === 'paid') {
        await triggerDelivery(orderId);
      }
      
      return result.rows[0];
    } else {
      console.error(`❌ 订单不存在: ${orderId}`);
    }
  } catch (error) {
    console.error("更新订单状态失败:", error);
    throw error;
  }
}

// 记录支付日志
async function logPayment(orderNo, paymentMethod, amount, transactionId, status, callbackData) {
  const { pool } = require("../config/database");
  
  try {
    const logQuery = `
      INSERT INTO payment_logs (order_no, payment_method, amount, transaction_id, status, callback_data)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    
    await pool.query(logQuery, [orderNo, paymentMethod, amount, transactionId, status, JSON.stringify(callbackData)]);
    console.log(`📝 支付日志记录成功: ${orderNo}`);
  } catch (error) {
    console.error("记录支付日志失败:", error);
    // 不抛出错误，避免影响主流程
  }
}

// 触发发货逻辑
async function triggerDelivery(orderNo) {
  try {
    // 这里可以调用现有的 cardService 来分配卡密
    const { assignCardsToOrder } = require("../services/cardService");
    
    console.log(`🚚 开始为订单 ${orderNo} 分配卡密...`);
    // TODO: 根据订单信息分配对应数量的卡密
    // await assignCardsToOrder(orderId, cards);
    
  } catch (error) {
    console.error("自动发货失败:", error);
  }
}

// 🔧 数据库迁移接口（开发环境使用）
router.post("/migrate", async (req, res) => {
  const { pool } = require("../config/database");
  
  try {
    // 添加支付相关字段
    await pool.query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100),
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),
      ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2);
    `);
    
    // 创建支付日志表
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payment_logs (
        id SERIAL PRIMARY KEY,
        order_no VARCHAR(50) NOT NULL,
        payment_method VARCHAR(20),
        amount NUMERIC(10,2),
        transaction_id VARCHAR(100),
        status VARCHAR(20),
        callback_data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    // 添加索引
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
      CREATE INDEX IF NOT EXISTS idx_payment_logs_order_no ON payment_logs(order_no);
      CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction_id ON payment_logs(transaction_id);
    `);
    
    res.json({ 
      success: true, 
      message: "支付相关数据库结构迁移完成" 
    });
  } catch (error) {
    console.error("数据库迁移失败:", error);
    res.status(500).json({ 
      success: false, 
      message: "数据库迁移失败: " + error.message 
    });
  }
});

// 🧪 测试接口（开发环境使用）
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "蓝鲸支付接口正常运行",
    database: "PostgreSQL",
    config: {
      mchId: BLUESKY_CONFIG.mchId,
      apiUrl: BLUESKY_CONFIG.apiUrl,
      notifyUrl: BLUESKY_CONFIG.notifyUrl
    },
    availableEndpoints: [
      "POST /api/payments/create - 创建支付订单",
      "POST /api/payments/callback - 支付回调（蓝鲸支付调用）",
      "GET /api/payments/status/:orderId - 查询支付状态",
      "POST /api/payments/migrate - 数据库迁移",
      "GET /api/payments/test - 测试接口"
    ]
  });
});

module.exports = router;
