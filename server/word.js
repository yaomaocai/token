// 服务端生成 Word 版词条文档（HTML 格式 .doc）
function catName(cats, id) {
  return (cats.find((c) => c.id === id) || {}).name || "";
}

function createWordDoc(t, config, cats) {
  const date = new Date();
  const dateStr = date.getFullYear() + "年" + (date.getMonth() + 1) + "月" + date.getDate() + "日";
  const cname = cats ? catName(cats, t.cat) : t.catName || "";
  const tags = (t.kw || []).map((k) => `<span class="tag">${k}</span>`).join("");
  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${t.name} · 工业词源</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
<style>
  body{font-family:"宋体",SimSun,"Microsoft YaHei",sans-serif;font-size:12pt;color:#1c2733;line-height:1.8;margin:2.5cm 2.4cm}
  h1{font-size:22pt;color:#0f1b2d;text-align:center;font-family:"黑体",SimHei,sans-serif;margin:0 0 4pt}
  .sub{text-align:center;color:#5b6b7b;font-size:11pt;margin:0 0 18pt}
  .meta{width:100%;border-collapse:collapse;margin:0 0 16pt}
  .meta td{border:1px solid #aab6c4;padding:6pt 10pt;font-size:11pt}
  .meta .k{background:#eef3f8;width:24%;font-weight:bold;color:#0f1b2d}
  h2{font-size:14pt;color:#e8590c;border-left:5px solid #e8590c;padding-left:8pt;margin:16pt 0 8pt;font-family:"黑体",SimHei,sans-serif}
  p{text-align:justify;text-indent:2em}
  .foot{margin-top:22pt;border-top:1px solid #d0d8e0;padding-top:8pt;font-size:10pt;color:#5b6b7b;text-align:center}
  .tag{display:inline-block;background:#eef3f8;border:1px solid #c7d6e6;color:#2c4f7c;padding:1pt 8pt;border-radius:10pt;font-size:10pt;margin-right:4pt}
</style>
</head>
<body>
  <h1>${t.name}</h1>
  <p class="sub">工业词源库 · 行业术语词条</p>
  <table class="meta">
    <tr><td class="k">术语名称</td><td>${t.name}</td></tr>
    <tr><td class="k">英文对照</td><td>${t.en}</td></tr>
    <tr><td class="k">所属分类</td><td>${cname}</td></tr>
    <tr><td class="k">关键词</td><td>${tags}</td></tr>
  </table>
  <h2>专业定义</h2>
  <p>${t.def}</p>
  <h2>词源由来</h2>
  <p>${t.origin}</p>
  <h2>应用场景</h2>
  <p>${t.scene}</p>
  <div class="foot">工业词源库 · ${dateStr} · 本文档由付费下载生成</div>
</body>
</html>`;
}

module.exports = { createWordDoc };
