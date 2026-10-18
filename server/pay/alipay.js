// 支付宝电脑网站支付（alipay.trade.page.pay）对接
// 需在 config.json -> payment.alipay 填入：appId、privateKey(应用私钥)、alipayPublicKey(支付宝公钥)
// 签名算法：RSA2 (SHA256withRSA)

const crypto = require("crypto");

// 生成支付参数（返回前端可直接提交的 form 或跳转 URL）
function createPayment(order, config) {
  const cfg = config.payment.alipay;
  if (!cfg.enabled) {
    throw new Error("支付宝支付未启用，请在 server/config.json 中启用并填写凭证");
  }
  const bizContent = {
    out_trade_no: order.orderNo,
    total_amount: Number(order.price).toFixed(2),
    subject: "工业词源下载 - 单条词源",
    product_code: "FAST_INSTANT_TRADE_PAY"
  };
  const params = {
    app_id: cfg.appId,
    method: "alipay.trade.page.pay",
    format: "JSON",
    charset: "utf-8",
    sign_type: "RSA2",
    timestamp: new Date().toISOString().replace(/\.\d+Z$/, "+08:00").replace("T", " ").replace("Z", ""),
    version: "1.0",
    notify_url: cfg.notifyUrl,
    return_url: cfg.returnUrl,
    biz_content: JSON.stringify(bizContent)
  };
  const sign = signParams(params, cfg.privateKey);
  params.sign = sign;
  return { channel: "alipay", orderNo: order.orderNo, amount: order.price, formParams: params, gateway: cfg.gateway };
}

// 按支付宝规则拼接待签名串
function buildSignString(params) {
  const keys = Object.keys(params).sort();
  return keys.filter((k) => params[k] !== "" && params[k] !== undefined && k !== "sign")
    .map((k) => `${k}=${params[k]}`).join("&");
}

function signParams(params, privateKey) {
  const content = buildSignString(params);
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(content, "utf8");
  return sign.sign(privateKey, "base64");
}

// 校验支付宝异步通知签名与金额
function verifyNotify(params, config, order) {
  const cfg = config.payment.alipay;
  // 验签
  const content = buildSignString(params);
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(content, "utf8");
  const ok = verifier.verify(cfg.alipayPublicKey, params.sign, "base64");
  if (!ok) return { ok: false, reason: "签名校验失败" };
  // 业务校验
  if (params.trade_status !== "TRADE_SUCCESS" && params.trade_status !== "TRADE_FINISHED") {
    return { ok: false, reason: "交易状态未成功" };
  }
  if (params.out_trade_no !== order.orderNo) return { ok: false, reason: "订单号不匹配" };
  if (Math.abs(Number(params.total_amount) - Number(order.price)) > 0.001) {
    return { ok: false, reason: "金额不匹配" };
  }
  return { ok: true, tradeNo: params.trade_no };
}

module.exports = { createPayment, verifyNotify };
