// 模拟支付（sandbox）：用于在未接入真实支付前跑通「下单→支付→解锁下载」全流程
// 生产环境请将 config.json 中 payment.mode 改为 alipay / wechat

function createPayment(order, config) {
  return {
    channel: "mock",
    orderNo: order.orderNo,
    amount: order.price,
    // 模拟支付：前端展示一个"模拟支付"按钮，点击后调用 /api/pay/mock/success 完成
    mock: true,
    message: "当前为模拟支付模式（未接入真实支付），点击下方按钮模拟支付成功。"
  };
}

module.exports = { createPayment };
