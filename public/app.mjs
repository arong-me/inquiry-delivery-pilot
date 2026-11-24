import { samples, startCase, reviewCase, evaluate } from "./workflow.mjs";
const $ = id => document.getElementById(id);
const key = "inquiry-pilot-records-v1";
const local = location.pathname === "/";
const status = message => { $("status").textContent = message; };
const routes = {draft:"待审报价草稿", clarify:"待审补充问题", human:"人工处理"};
const states = {pending:"待审核", approved:"已确认草稿", returned:"已退回或转人工"};
let records = [];

function element(tag, text) {
  const item = document.createElement(tag);
  if (text) item.textContent = text;
  return item;
}
async function api(path, data) {
  const response = await fetch(path,data === undefined ? undefined : {
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}
function saveBrowser() { localStorage.setItem(key,JSON.stringify(records)); }
async function submit(action) {
  try { await action(); render(); } catch (error) { status(error.message); }
}
function render() {
  $("records").replaceChildren(...records.map(record => {
    const item = element("article");
    item.append(element("h3",routes[record.route]),element("p",states[record.state]),element("p",record.text));
    if (record.draft) item.append(element("p",record.draft));
    const details = element("details");
    details.append(element("summary","查看执行记录"),element("pre",record.trace.join("\n")));
    item.append(details);
    if (record.review) item.append(element("p","审核说明："+record.review.note));
    if (record.state === "pending") {
      const label = element("label","审核说明");
      const input = element("input");
      input.maxLength = 250;
      label.append(input);
      item.append(label);
      for (const [action,title] of [["approve","确认草稿"],["return","退回／转人工"]]) {
        if (action === "approve" && !record.draft) continue;
        const button = element("button",title);
        button.type = "button";
        button.onclick = () => submit(async () => {
          const changed = local ? await api(`/api/cases/${record.id}/review`,{action,note:input.value}) : reviewCase(record,action,input.value,new Date().toISOString());
          records = records.map(row => row.id === changed.id ? changed : row);
          if (!local) saveBrowser();
          status("已记录审核决策。");
        });
        item.append(button);
      }
    }
    return item;
  }));
}
$("mode").textContent = local ? "本地 API 模式 · SQLite 持久化" : "线上演示模式 · 记录保存在当前浏览器";
if (local) $("portfolio-link").href = "https://meng.fanrong.dev/#work";
await submit(async () => {
  records = local ? await api("/api/cases") : JSON.parse(localStorage.getItem(key) || "[]");
});
samples.forEach((item,index)=> {
  const option = element("option",item.name);
  option.value = index;
  $("sample").append(option);
});
$("sample").onchange = event => {
  if (event.target.value !== "") $("message").value = samples[event.target.value].text;
};
$("intake").onsubmit = event => {
  event.preventDefault();
  return submit(async () => {
    const text = $("message").value;
    const record = local ? await api("/api/cases",{text}) : startCase(text,crypto.randomUUID(),new Date().toISOString());
    records = [record,...records].slice(0,100);
    if (!local) saveBrowser();
    status("已生成记录，可以开始审核。");
  });
};
$("regression").onclick = () => {
  const results=evaluate();
  $("results").hidden=false;
  $("results").textContent=[`${results.filter(r=>r.passed).length}/${results.length} 通过`,...results.map(r=>`${r.passed?"✓":"×"} ${r.name} · 预期 ${routes[r.route]} · 实际 ${routes[r.actual]}`)].join("\n");
};
$("export").onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(records,null,2)],{type:"application/json"}));
  const link = element("a");
  link.href=url;
  link.download="inquiry-review.json";
  link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
};
