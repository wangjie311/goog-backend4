// examples/frontend-payment-example.js
// 前端调用蓝鲸支付的示例代码

// 🛒 创建支付订单示例
async function createPayment() {
  try {
    const response = await fetch("http://localhost:5000/api/payments/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        orderId: `ORDER_${Date.now()}`, // 生成唯一订单号
        amount: 10.0,                   // 支付金额（元）
        productName: "Google账号",       // 商品名称
        payType: "wechat"              // 支付方式：wechat / alipay
      })
    });

    const data = await response.json();
    
    if (data.success) {
      console.log("✅ 支付订单创建成功:", data);
      // 打开支付二维码页面
      window.open(data.payUrl, '_blank');
      
      // 可以开始轮询查询支付状态
      pollPaymentStatus(data.orderId);
    } else {
      console.error("❌ 支付订单创建失败:", data.msg);
      alert("支付失败：" + data.msg);
    }
  } catch (error) {
    console.error("请求失败:", error);
    alert("网络错误，请稍后重试");
  }
}

// 🔍 轮询查询支付状态
async function pollPaymentStatus(orderId) {
  const maxAttempts = 60; // 最多查询60次（5分钟）
  let attempts = 0;
  
  const poll = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/payments/status/${orderId}`);
      const data = await response.json();
      
      if (data.success && data.status === 'paid') {
        console.log("✅ 支付成功！");
        // 跳转到支付成功页面
        window.location.href = `/payment-success?orderId=${orderId}`;
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        // 每5秒查询一次
        setTimeout(poll, 5000);
      } else {
        console.log("⏰ 支付超时，停止查询");
      }
    } catch (error) {
      console.error("查询支付状态失败:", error);
    }
  };
  
  // 开始轮询
  poll();
}

// 🧪 测试接口连通性
async function testAPI() {
  try {
    const response = await fetch("http://localhost:5000/api/payments/test");
    const data = await response.json();
    console.log("API测试结果:", data);
  } catch (error) {
    console.error("API测试失败:", error);
  }
}

// React 组件示例
const PaymentComponent = () => {
  const [loading, setLoading] = useState(false);
  
  const handlePayment = async (payType) => {
    setLoading(true);
    
    try {
      const response = await fetch("http://localhost:5000/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: `ORDER_${Date.now()}`,
          amount: 10.0,
          productName: "Google账号",
          payType: payType
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 打开支付页面
        window.open(data.payUrl, '_blank');
        // 开始轮询
        pollPaymentStatus(data.orderId);
      } else {
        alert("支付失败：" + data.msg);
      }
    } catch (error) {
      alert("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="payment-buttons">
      <button 
        onClick={() => handlePayment('wechat')} 
        disabled={loading}
        className="btn-wechat"
      >
        {loading ? '创建中...' : '微信支付'}
      </button>
      
      <button 
        onClick={() => handlePayment('alipay')} 
        disabled={loading}
        className="btn-alipay"
      >
        {loading ? '创建中...' : '支付宝'}
      </button>
    </div>
  );
};

// 导出函数供使用
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createPayment,
    pollPaymentStatus,
    testAPI
  };
}
