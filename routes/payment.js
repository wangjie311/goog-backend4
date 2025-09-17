// routes/payment.js
const express = require("express");
const axios = require("axios");
const crypto = require("crypto");

const router = express.Router();

// 蓝鲸支付配置
const PAY_BASE_URL = "https://2282045.pay.lanjingzf.com";
const PAY_KEY = "08b19b019aa86ce42b30ce1c38110bb2"; // 通讯密钥
const RETURN_URL = "http://localhost:5173/payment-success"; // 同步回调
const NOTIFY_URL = "http://localhost:5000/api/payment/notify"; // 异步回调（必须公网可访问）

// 创建订单接口
router.post("/create", async (req, res) => {
  try {
    const { orderId, price, type } = req.body; 
    // type: 1=微信, 2=支付宝
    const param = "testParam"; // 你可以传用户id之类的参数

    // 生成签名 sign = md5(payId + param + type + price + key)
    const signStr = orderId + param + type + price + PAY_KEY;
    const sign = crypto.createHash("md5").update(signStr).digest("hex");

    // 请求蓝鲸 createOrder 接口
    const response = await axios.get(`${PAY_BASE_URL}/createOrder`, {
      params: {
        payId: orderId,
        type,
        price,
        sign,
        param,
        isHtml: 0,
        returnUrl: RETURN_URL,
        notifyUrl: NOTIFY_URL,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error("创建订单失败:", err.message);
    res.status(500).json({ success: false, message: "创建订单失败" });
  }
});

// 异步回调接口（蓝鲸支付会调用这个）
router.get("/notify", (req, res) => {
  try {
    const { payId, param, type, price, reallyPrice, sign } = req.query;

    // 验签 sign = md5(payId + param + type + price + reallyPrice + key)
    const signStr = payId + param + type + price + reallyPrice + PAY_KEY;
    const checkSign = crypto.createHash("md5").update(signStr).digest("hex");

    if (checkSign !== sign) {
      console.error("签名验证失败", req.query);
      return res.send("error_sign");
    }

    console.log("支付成功回调：", req.query);

    // TODO: 在数据库中更新订单状态（payId -> 已支付）

    res.send("success");
  } catch (err) {
    console.error("回调处理失败:", err.message);
    res.send("error");
  }
});

module.exports = router;
