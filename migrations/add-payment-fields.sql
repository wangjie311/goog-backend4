-- migrations/add-payment-fields.sql
-- 为蓝鲸支付功能添加额外字段

-- 添加支付相关字段到 orders 表
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100),  -- 第三方支付交易号
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20),   -- 支付方式 (wechat/alipay)
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(10,2);    -- 实际支付金额

-- 创建支付记录表（可选，用于记录支付流水）
CREATE TABLE IF NOT EXISTS payment_logs (
  id SERIAL PRIMARY KEY,
  order_no VARCHAR(50) NOT NULL,
  payment_method VARCHAR(20),
  amount NUMERIC(10,2),
  transaction_id VARCHAR(100),
  status VARCHAR(20),
  callback_data JSONB,  -- 存储回调原始数据
  created_at TIMESTAMP DEFAULT NOW()
);

-- 添加索引优化查询
CREATE INDEX IF NOT EXISTS idx_orders_order_no ON orders(order_no);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_payment_logs_order_no ON payment_logs(order_no);
CREATE INDEX IF NOT EXISTS idx_payment_logs_transaction_id ON payment_logs(transaction_id);

-- 插入一些示例数据（可选）
-- INSERT INTO categories (name) VALUES ('Google账号') ON CONFLICT DO NOTHING;
