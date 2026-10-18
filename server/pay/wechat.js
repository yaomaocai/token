// 微信支付 Native（扫码）对接（API v3）
// 需在 config.json -> payment.wechat 填入：appId、mchId、apiV3Key、serialNo、privateKeyPath 商户证书
// 参考 https://pay.weixin.qq.com/doc/v3/merchant/4012791881

const https = require("https");
const crypto = require("crypto");
const fs = require("fs");

function createPayment(order, config) {
  const cfg = config.payment.wechat;
  if (!cfg.enabled) {
    throw new Error("微信支付未启用，请在 server/config.json 中启用并填写凭证");
  }
  // 构造请求体（Native 下单）
  const payload = JSON.stringify({
    appid: cfg.appId,
    mchid: cfg.mchId,
    description: "工业词源下载 - 单条词源",
    out_trade_no: order.orderNo,
    notify_url: cfg.notifyUrl,
    amount: { total: Math.round(order.price * 100), currency: "CNY" }
  });
  const url = "/v3/pay/transactions/native";
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString("hex");
  const message = `POST\n${url}\n${timestamp}\n${nonce}\n${payload}\n`;
  const privateKey = fs.readFileSync(cfg.privateKeyPath, "utf8");
  const sign = crypto.createSign("RSA-SHA256").update(message, "utf8").sign(privateKey, "base64");
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${cfg.mchId}",nonce_str="${nonce}",signature="${sign}",timestamp="${timestamp}",serial_no="${cfg.serialNo}"`;
  const options = {
    hostname: "api.mch.weixin.qq.com",
    path: url,
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": authorization, "User-Agent": "industry-lexicon/1.0" }
  };
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ channel: "wechat", orderNo: order.orderNo, amount: order.price, response: JSON.parse(data) }); }
        catch (e) { reject(new Error("微信下单失败: " + data)); }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { createPayment };
