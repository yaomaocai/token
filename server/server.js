// 工业词源库后端：免费浏览 + 付费下载
const express = require("express");
const path = require("path");
const fs = require("fs");
const { CATS, TERMS } = require("./terms");
const db = require("./db");
const pay = require("./pay");
const { createWordDoc } = require("./word");

const config = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 静态资源（前端页面）
app.use(express.static(path.join(__dirname, "..", "public")));

const TERM_MAP = new Map(TERMS.map((t) => [t.id, t]));
const CAT_MAP = new Map(CATS.map((c) => [c.id, c]));

// 对外暴露的词条（不含敏感字段）
function publicTerm(t) {
  return { id: t.id, name: t.name, en: t.en, cat: t.cat, catName: CAT_MAP.get(t.cat)?.name, kw: t.kw, def: t.def, origin: t.origin, scene: t.scene };
}

// ---------- 免费浏览 ----------
app.get("/api/terms", (req, res) => {
  res.json({ categories: CATS, terms: TERMS.map(publicTerm), total: TERMS.length });
});

app.get("/api/terms/:id", (req, res) => {
  const t = TERM_MAP.get(req.params.id);
  if (!t) return res.status(404).json({ error: "词条不存在" });
  res.json(publicTerm(t));
});

// 站点配置（价格、支付渠道）
app.get("/api/config", (req, res) => {
  const mode = config.payment.mode;
  res.json({
    siteTitle: config.siteTitle,
    pricing: config.pricing,
    paymentMode: mode,
    channels: mode === "mock" ? ["mock"] : (mode === "alipay" ? ["alipay"] : ["wechat"])
  });
});

// ---------- 下单 ----------
app.post("/api/orders", (req, res) => {
  const { termId, channel } = req.body || {};
  const t = TERM_MAP.get(termId);
  if (!t) return res.status(400).json({ error: "词条不存在" });
  const price = Number(config.pricing.single) || 0;
  const order = db.createOrder({ termId, channel: channel || config.payment.mode, price });
  let payInfo;
  try {
    payInfo = pay.createPayment(order, config);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
  res.json({ order: { orderNo: order.orderNo, termId: order.termId, price: order.price, status: order.status }, payInfo });
});

// 查询订单状态
app.get("/api/orders/:orderNo", (req, res) => {
  const order = db.findOrder(req.params.orderNo);
  if (!order) return res.status(404).json({ error: "订单不存在" });
  const t = TERM_MAP.get(order.termId);
  res.json({ orderNo: order.orderNo, termId: order.termId, termName: t?.name, price: order.price, status: order.status, paidAt: order.paidAt });
});

// ---------- 模拟支付（仅 mock 模式） ----------
app.post("/api/pay/mock/success", (req, res) => {
  if ((config.payment.mode || "mock") !== "mock") {
    return res.status(400).json({ error: "非模拟支付模式" });
  }
  const { orderNo } = req.body || {};
  const order = db.findOrder(orderNo);
  if (!order) return res.status(404).json({ error: "订单不存在" });
  const paid = db.markPaid(orderNo, "MOCK-" + orderNo);
  res.json({ ok: true, orderNo, status: paid.status });
});

// ---------- 支付回调（真实支付时使用） ----------
// 支付宝异步通知
app.post("/api/pay/alipay/notify", (req, res) => {
  const params = req.body || {};
  const order = db.findOrder(params.out_trade_no || "");
  if (!order) return res.send("fail");
  const result = pay.alipay.verifyNotify(params, config, order);
  if (result.ok) {
    db.markPaid(order.orderNo, result.tradeNo);
    return res.send("success");
  }
  res.send("fail");
});

// 微信支付回调（v3 需验签，此处为占位，接真实支付时补充）
app.post("/api/pay/wechat/notify", (req, res) => {
  // TODO: 校验微信 v3 请求头签名后解析 resource，取 out_trade_no / transaction_id
  res.status(200).json({ code: "FAIL", message: "通知处理未实现，请接入真实凭证后完善" });
});

// ---------- 下载（需已支付） ----------
app.get("/api/download/:termId", (req, res) => {
  const t = TERM_MAP.get(req.params.termId);
  if (!t) return res.status(404).json({ error: "词条不存在" });
  const purchased = db.isPurchased(t.id);
  if (!purchased) {
    return res.status(403).json({ error: "未购买，请先完成支付后下载", code: "NOT_PAID" });
  }
  const doc = createWordDoc(t, config, CATS);
  res.setHeader("Content-Type", "application/msword;charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent("工业词源-" + t.name + ".doc")}`);
  res.send(Buffer.from("\ufeff" + doc, "utf8"));
});

// ---------- 启动 ----------
const PORT = config.port || 3000;
app.listen(PORT, () => {
  console.log(`[工业词源库] 服务已启动: http://0.0.0.0:${PORT}`);
  console.log(`[支付模式] ${config.payment.mode}`);
  console.log(`[提示] 修改 server/config.json 可调整端口、价格与支付凭证`);
});
