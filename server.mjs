import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { startCase, reviewCase } from "./public/workflow.mjs";

const db = new DatabaseSync(process.env.PILOT_DB || "inquiries.sqlite");
db.exec("CREATE TABLE IF NOT EXISTS cases (id TEXT PRIMARY KEY, record TEXT NOT NULL)");
const list = db.prepare("SELECT record FROM cases ORDER BY rowid DESC LIMIT 100");
const put = db.prepare("INSERT INTO cases VALUES (?, ?)");
const get = db.prepare("SELECT record FROM cases WHERE id = ?");
const update = db.prepare("UPDATE cases SET record = ? WHERE id = ?");
const assets = {"/":"index.html","/app.mjs":"app.mjs","/workflow.mjs":"workflow.mjs"};
const json = (res,status,data) => res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"}).end(JSON.stringify(data));
async function body(req) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8192) throw new Error("请求过长。");
  }
  return JSON.parse(raw);
}
const port = Number(process.env.PILOT_PORT || 8788);
createServer(async (req,res) => {
  try {
    const path = new URL(req.url,"http://127.0.0.1").pathname;
    if (req.method === "GET" && path === "/api/cases") return json(res,200,list.all().map(row => JSON.parse(row.record)));
    if (req.method === "GET" && path === "/api/health") return json(res,200,{status:"ok"});
    if (req.method === "POST" && path === "/api/cases") {
      const input = await body(req);
      const record = startCase(input.text,randomUUID(),new Date().toISOString());
      put.run(record.id,JSON.stringify(record));
      return json(res,201,record);
    }
    const match = path.match(/^\/api\/cases\/([a-f0-9-]+)\/review$/);
    if (req.method === "POST" && match) {
      const data = await body(req);
      const row = get.get(match[1]);
      if (!row) return json(res,404,{error:"记录不存在。"});
      const reviewed = reviewCase(JSON.parse(row.record),data.action,data.note,new Date().toISOString());
      update.run(JSON.stringify(reviewed),reviewed.id);
      return json(res,200,reviewed);
    }
    if (req.method === "GET" && Object.hasOwn(assets,path)) {
      const file = assets[path];
      const data = await readFile(new URL("public/"+file,import.meta.url));
      return res.writeHead(200,{"Content-Type":file.endsWith(".mjs")?"text/javascript":"text/html; charset=utf-8"}).end(data);
    }
    return json(res,404,{error:"路径不存在。"});
  } catch (error) {
    return json(res,400,{error:error.message});
  }
}).listen(port,"127.0.0.1",()=>console.log(`http://127.0.0.1:${port}/`));
