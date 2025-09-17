// server.js
const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/payment");
const paymentsRoutes = require("./routes/payments"); // 新增蓝鲸支付路由

const app = express();

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 支持URL编码的请求体（回调需要）

// 健康检查端点（Render 需要）
app.get("/", (req, res) => {
  res.json({ 
    message: "Google Accounts Backend API", 
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// 路由
app.use("/api/payment", paymentRoutes);
app.use("/api/payments", paymentsRoutes); // 蓝鲸支付路由
app.use("/api/orders", require("./routes/orders"));

// 启动服务 - 使用 Render 的动态端口
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
