// 轻量 JSON 文件数据库：存储订单与已购下载记录
const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ orders: [], downloads: [] }, null, 2), "utf8");
  }
}

function load() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (e) {
    return { orders: [], downloads: [] };
  }
}

function save(db) {
  ensure();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

// 生成订单号：yyyyMMddHHmmss + 6位随机
function genOrderNo() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const ts = "" + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  const rand = Math.floor(100000 + Math.random() * 900000);
  return "IL" + ts + rand;
}

function createOrder({ termId, channel, price }) {
  const db = load();
  const order = {
    orderNo: genOrderNo(),
    termId,
    channel,          // alipay | wechat | mock
    price,
    status: "pending", // pending | paid | expired
    createdAt: new Date().toISOString(),
    paidAt: null
  };
  db.orders.push(order);
  save(db);
  return order;
}

function findOrder(orderNo) {
  const db = load();
  return db.orders.find((o) => o.orderNo === orderNo) || null;
}

function markPaid(orderNo, tradeNo) {
  const db = load();
  const order = db.orders.find((o) => o.orderNo === orderNo);
  if (!order) return null;
  if (order.status !== "paid") {
    order.status = "paid";
    order.paidAt = new Date().toISOString();
    order.tradeNo = tradeNo || "";
    save(db);
  }
  return order;
}

// 是否已购买该词源（只要有任一已支付订单即视为已购）
function isPurchased(termId) {
  const db = load();
  return db.orders.some((o) => o.termId === termId && o.status === "paid");
}

module.exports = { createOrder, findOrder, markPaid, isPurchased, load };
