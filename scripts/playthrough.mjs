import puppeteer from "puppeteer-core";
const BASE = "http://127.0.0.1:4176";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function click(page, text) {
  const ok = await page.evaluate((text) => {
    const nodes = [...document.querySelectorAll("button,a")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const hit = nodes.find((el) => el.textContent.replace(/\s+/g, "").includes(text.replace(/\s+/g, "")));
    if (!hit) return false;
    hit.scrollIntoView({ block: "center" });
    hit.click();
    return true;
  }, text);
  if (!ok) throw new Error("未找到：" + text);
  await sleep(500);
}

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--disable-gpu", "--hide-scrollbars"], defaultViewport: { width: 1440, height: 1000 } });
const p = await b.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

await p.goto(BASE, { waitUntil: "networkidle2" });
await p.evaluate(() => localStorage.clear());
await p.goto(BASE, { waitUntil: "networkidle2" });
await p.screenshot({ path: "shots/20-landing.png" });
await click(p, "免费体验");
await sleep(900);
await p.screenshot({ path: "shots/21-scene1.png" });

const steps = [
  [["查看官方订单", "查看发消息的账号", "回官方页面重新下单"], "22-ticket-done"],
  [["气泡水 39 元", "纸杯 25 元", "饼干 19 元", "查看优惠规则", "去结算"], "23-budget-done"],
  [["查看完整物流记录", "去城西配送站"], "24-parcel-done"],
  [["读一遍活动须知", "直接登记报名"], "25-rules-done"],
  [["现在出发"], "26-bus-done"],
];

for (const [actions, shot] of steps) {
  for (const a of actions) await click(p, a);
  await sleep(1000);
  await p.screenshot({ path: `shots/${shot}.png` });
  const txt = await p.evaluate(() => document.body.innerText);
  console.log("·", shot, txt.includes("任务完成") ? "任务完成" : "任务未完成", (txt.match(/(\d{1,3})\s*\/\s*100/) ?? [])[1] ?? "?");
  await click(p, txt.includes("查看今天的结果") ? "查看今天的结果" : "继续下一件事");
  await sleep(800);
}

await p.goto(BASE + "/final", { waitUntil: "networkidle2" });
await sleep(1000);
await p.screenshot({ path: "shots/27-final.png", fullPage: true });
const finalText = await p.evaluate(() => document.body.innerText);
console.log("· 最终分数", (finalText.match(/(\d{3})\s*\/?\s*500/) ?? [])[1] ?? "?", "| 结局", finalText.includes("高效协作者") ? "高效协作者" : "其它");
await click(p, "请求链上成绩凭证");
await sleep(800);
console.log("· 链上凭证：", (await p.evaluate(() => document.body.innerText)).includes("尚未配置") ? "如实返回未开放" : "其它");

await b.close();
if (errors.length) { console.log("错误："); errors.forEach((e) => console.log(" -", e)); process.exitCode = 1; }
else console.log("全流程无控制台错误");
