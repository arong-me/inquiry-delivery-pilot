export const samples = [
  { name:"常规报价", text:"请报价 200 台 DN50 阀门，交付成都。", route:"draft" },
  { name:"报价与售后混合", text:"想询价 200 台 DN50 阀门，上一批有漏液问题。", route:"human" },
  { name:"规格缺失", text:"请报价 200 台阀门。", route:"clarify" },
  { name:"超出目录", text:"请报价 10 台 DN500 阀门。", route:"human" },
  { name:"交期承诺", text:"请报价 20 台 DN50 阀门，保证明天到吗？", route:"human" },
  { name:"非询价", text:"你好，我想了解一下。", route:"human" },
];

const catalog = new Set(["DN25","DN50","DN80"]);

export function routeInquiry(text) {
  const message = typeof text === "string" ? text.trim() : "";
  if (!message || message.length > 1000) throw new Error("请输入 1–1000 字的询盘正文。");
  const models = [...new Set(message.toUpperCase().match(/\bDN\d+\b/g) ?? [])];
  const quantity = Number(message.match(/(?:^|[^\d])(\d{1,6})\s*(?:台|件|套|个)/)?.[1] ?? 0);
  const trace = [`提取：规格 ${models.join("、") || "缺失"}，数量 ${quantity || "缺失"}。`];
  const output = (route, reason, draft = "") => ({route,reason,draft,trace:[...trace,reason]});
  if (/投诉|漏液|退款|索赔|坏了/.test(message)) return output("human","识别到售后或投诉，优先交人工。");
  if (/保证|承诺|明天到|赔偿/.test(message)) return output("human","含交期或商业承诺，须人工核实。");
  if (!/询价|报价|多少钱/.test(message)) return output("human","未识别为标准报价请求，转人工分诊。");
  if (models.length > 1) return output("human","出现多个规格，须人工确认各型号的数量。");
  if (!models.length || !quantity) return output("clarify","缺规格或数量，先生成澄清草稿。","您好，为了准确报价，请提供阀门规格和采购数量。");
  if (!catalog.has(models[0])) return output("human","型号未匹配演示目录，不自动承诺供货。");
  return output("draft","目录和数量匹配，生成待审草稿。",`您好，已收到 ${quantity} 台 ${models[0]} 阀门的询价。价格、库存及交期确认后再回复您。`);
}

export function startCase(text, id, at) {
  return {id, text:text.trim(), ...routeInquiry(text), state:"pending", review:null, createdAt:at};
}

export function reviewCase(record, action, note, at) {
  if (record.state !== "pending") throw new Error("该记录已完成审核。");
  if (!["approve","return"].includes(action)) throw new Error("审核动作无效。");
  if (action === "approve" && !record.draft) throw new Error("只有包含草稿的记录可以确认。");
  const reason = typeof note === "string" ? note.trim() : "";
  if (reason.length === 0 || reason.length > 250) throw new Error("请填写 1–250 字审核说明。");
  return {...record,state:action === "approve" ? "approved" : "returned",review:{action,note:reason,at}};
}

export function evaluate() {
  return samples.map(item => {
    const actual = routeInquiry(item.text).route;
    return {...item,actual,passed:actual === item.route};
  });
}
