# 外贸询盘交付工作台

面向 FDE 面试的可复现交付原型。输入合成询盘，按规则分流为待审报价、补充问题或人工任务；记录草稿、审核说明和执行记录。生成的草稿通过人工确认后也不会对外发送。

## 运行

需要 Node.js 24，无需安装依赖。

    node server.mjs

打开 http://127.0.0.1:8788/。默认在当前目录创建 inquiries.sqlite。可通过 PILOT_PORT 和 PILOT_DB 指定端口和数据库路径。服务仅监听本机回环地址。

公开体验 https://meng.fanrong.dev/inquiry-pilot/ 。线上静态页面与本地 API 共享分流和审核规则，浏览器模式把数据保存在本机浏览器；本地模式通过 HTTP API 写入 SQLite。

## 面试演示

1. 选择常规报价样本，提交后核对草稿，填写审核意见并确认。
2. 选择报价与售后混合样本，检查人工分流原因，记录接管说明。
3. 运行六条规则回归，然后导出 JSON 审核记录。
4. 本地模式重启服务并刷新，验证已审记录仍在。

## 接口

- GET /api/health：服务就绪状态
- GET /api/cases：最近 100 条审核记录
- POST /api/cases：提交 JSON，字段 text
- POST /api/cases/{id}/review：提交 JSON，字段 action（approve 或 return）和 note

这是以合成数据验证业务分流、人工审核和持久化的原型。客户试点需另行接入商品目录和 CRM 测试环境，并验证身份权限、业务样本与真实处理耗时。
