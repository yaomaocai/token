# 工业词源库 · 免费浏览 + 付费下载系统

一套「免费浏览 + 付费下载」的工业词源网站，支持支付宝 / 微信支付。当前使用**模拟支付模式**即可跑通全流程，接入真实支付只需填写凭证。

---

## 目录结构

```
提供行业词源下载网站/
├── index.html            # 原 GitHub Pages 免费版（保留）
├── public/
│   └── index.html        # 付费版前端（由后端托管，访问 / 即是）
└── server/               # Node.js 后端
    ├── server.js         # 主服务（Express）
    ├── config.json       # 配置：端口、价格、支付凭证（★ 需修改）
    ├── terms.js          # 48 条词源数据
    ├── db.js             # JSON 文件数据库（订单/已购）
    ├── word.js           # Word 文档生成
    ├── pay/              # 支付模块（mock / 支付宝 / 微信）
    └── data/db.json      # 运行后自动生成
```

---

## 一、本地运行（先跑通）

```bash
cd server
npm install          # 安装依赖（国内可用 npm install --registry=https://registry.npmmirror.com）
node server.js
```

浏览器打开 `http://localhost:3000` 即可使用。

**演示流程**：点「下载 Word」→ 弹窗 → 点「✅ 模拟支付成功」→ 支付成功 → 立即下载。

---

## 二、部署到云服务器

### 1. 上传项目
把整个 `server/` 目录上传到云服务器（如 `/www/wwwroot/industry-lexicon/`）。

### 2. 安装 Node.js（如未装）
```bash
# CentOS/Ubuntu 示例
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -   # 或 deb.nodesource.com
yum install -y nodejs   # 或 apt install -y nodejs
node -v
```

### 3. 安装依赖并启动
```bash
cd /www/wwwroot/industry-lexicon/server
npm install --registry=https://registry.npmmirror.com
node server.js
```

### 4. 用 PM2 守护进程（推荐，崩溃自动重启）
```bash
npm install -g pm2
pm2 start server.js --name industry-lexicon
pm2 save
pm2 startup   # 按提示执行，实现开机自启
```

### 5. 开放端口 / 反向代理
- **直接访问**：云服务器安全组放行 `3000` 端口，访问 `http://服务器IP:3000`
- **推荐 Nginx + HTTPS**（支付回调必须用公网可访问的 HTTPS 域名）：

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
再用 Certbot 申请免费 HTTPS 证书。

---

## 三、修改配置 `server/config.json`

```jsonc
{
  "port": 3000,                        // 服务端口
  "siteUrl": "http://你的域名或IP:3000",
  "pricing": { "single": 2.00 },       // 单条下载价格（元）
  "payment": {
    "mode": "mock",                    // mock | alipay | wechat
    "alipay": {
      "enabled": false,
      "appId": "",                     // 支付宝开放平台 AppID
      "privateKey": "",                // 应用私钥（PKCS8，含 -----BEGIN----）
      "alipayPublicKey": "",           // 支付宝公钥
      "notifyUrl": "https://你的域名/api/pay/alipay/notify",
      "returnUrl": "https://你的域名/"
    },
    "wechat": {
      "enabled": false,
      "appId": "",                     // 微信开放平台/公众号 AppID
      "mchId": "",                     // 商户号
      "apiV3Key": "",                  // APIv3 密钥
      "serialNo": "",                  // 商户证书序列号
      "privateKeyPath": "",            // 商户私钥文件路径
      "notifyUrl": "https://你的域名/api/pay/wechat/notify"
    }
  }
}
```

改完配置后 `pm2 restart industry-lexicon` 生效。

---

## 四、接入真实支付（支付宝 / 微信）

### 支付宝
1. 前往 [支付宝开放平台](https://open.alipay.com) 创建「网页/移动应用」，获取 **AppID**
2. 生成 **应用私钥 + 应用公钥**，并把公钥上传给支付宝，换取 **支付宝公钥**
3. 配置 **服务器异步通知地址** 为 `https://你的域名/api/pay/alipay/notify`
4. 把 AppID、应用私钥、支付宝公钥填入 `config.json`，`mode` 改 `"alipay"`，`enabled` 改 `true`

### 微信支付
1. [微信支付商户平台](https://pay.weixin.qq.com) 开通 Native 支付，获取 **商户号**
2. 下载 **商户 API 证书**（含私钥），配置 APIv3 密钥
3. 回调地址填 `https://你的域名/api/pay/wechat/notify`
4. 填入 `config.json` 对应字段，`mode` 改 `"wechat"`，`enabled` 改 `true`

> ⚠️ 真实支付需要**企业/个体工商户资质**并完成签约。个人账号无法开通商户收款。
> ⚠️ 支付回调地址**必须是公网可访问的 HTTPS 域名**，否则收不到支付成功通知。

---

## 五、安全与运维提示

- 生产环境请使用 **HTTPS**，避免支付信息被劫持。
- `server/data/db.json` 为订单与已购记录，**请定期备份**。
- 金额校验已在服务端完成（回调验签 + 金额比对），前端无法伪造已支付状态。
- 如需按「登录后下载」或「限次下载」，可在后端增加账户体系（当前为无登录单次购买模式）。

---

## 接口一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/terms | 词源列表（免费浏览） |
| GET | /api/terms/:id | 词条详情 |
| GET | /api/config | 站点配置（价格/支付模式） |
| POST | /api/orders | 创建订单，返回支付参数 |
| GET | /api/orders/:orderNo | 查询订单状态 |
| POST | /api/pay/mock/success | 模拟支付成功（仅 mock 模式） |
| POST | /api/pay/alipay/notify | 支付宝异步通知回调 |
| POST | /api/pay/wechat/notify | 微信支付回调 |
| GET | /api/download/:termId | 下载 Word（需已支付，否则 403） |

> AI生成

> [auto-push test] 2026-10-18 10:15:18

> AI生成
