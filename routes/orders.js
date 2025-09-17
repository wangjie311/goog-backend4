// routes/orders.js
const express = require("express");
const router = express.Router();

// 测试订单数据库（模拟数据，可以改成数据库查询）
const mockOrders = {
  "123": {
    orderNo: "123",
    productName: "Google 账号",
    totalPrice: 9.9,
    createTime: "2025-09-17 12:00:00",
    accountInfo: {
      account: "test@gmail.com",
      password: "abc123456"
    },
    notice: "请尽快修改密码并绑定辅助邮箱。",
    productImage: "/images/hotmail-icon.png"
  }
};

// 获取订单详情
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const order = mockOrders[id];

  if (order) {
    return res.json({ success: true, data: order });
  } else {
    return res.status(404).json({ success: false, message: "订单不存在" });
  }
});

// 获取订单状态
router.get("/:id/status", (req, res) => {
  const { id } = req.params;
  if (mockOrders[id]) {
    return res.json({ success: true, status: "已完成" });
  } else {
    return res.status(404).json({ success: false, message: "订单不存在" });
  }
});

module.exports = router;
