import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:4176";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "shots/materials";
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function click(page, text) {
  const ok = await page.evaluate((t) => {
    const norm = (s) => s.replace(/\s+/g, "");
    const nodes = [...document.querySelectorAll("button,a")].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    const hit = nodes.find((el) => norm(el.textContent).includes(norm(t)));
    if (!hit) return false;
    hit.scrollIntoView({ block: "center" });
    hit.click();
    return true;
  }, text);
  if (!ok) throw new Error("未找到按钮：" + text);
  await sleep(750);
}

async function scrollTo(page, top) {
  await page.evaluate((top) => {
    const el = [...document.querySelectorAll("div")].find((d) => {
      const s = getComputedStyle(d);
      return s.overflowY === "auto" && d.scrollHeight > d.clientHeight;
    });
    if (el) el.scrollTop = top === "bottom" ? el.scrollHeight : Number(top) || 0;
    window.scrollTo({ top: 0 });
  }, top);
  await sleep(300);
}

async function shot(page, name, pos = 0) {
  await scrollTo(page, pos);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("·", name);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=2"],
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
});

const page = await browser.newPage();
page.on("pageerror", (e) => console.log("页面错误:", e.message));

await page.goto(BASE, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle2" });
await sleep(700);
await shot(page, "01-landing");

await click(page, "免费体验");
await sleep(900);
await shot(page, "02-ticket", 0);

await click(page, "查看官方订单");
await click(page, "查看发消息的账号");
await shot(page, "03-ticket-verify", "bottom");

await click(page, "按链接付款");
await sleep(600);
await shot(page, "04-ticket-loss", 60);

await click(page, "联系平台举报并申请冻结");
await shot(page, "05-ticket-settle");
await click(page, "继续下一件事");

await click(page, "气泡水 39 元");
await click(page, "纸杯 25 元");
await click(page, "薯片 32 元");
await click(page, "查看优惠规则");
await shot(page, "06-budget", 0);
await click(page, "去结算");
await shot(page, "07-budget-settle");
await click(page, "继续下一件事");

await click(page, "打开物流地图");
await click(page, "查看完整物流记录");
await shot(page, "08-parcel", 0);
await click(page, "去城西配送站");
await shot(page, "09-parcel-settle");
await click(page, "继续下一件事");

await click(page, "读一遍活动须知");
await shot(page, "10-rules", 0);
await click(page, "直接登记报名");
await click(page, "继续下一件事");

await click(page, "现在出发");
await shot(page, "11-bus-settle");
await click(page, "查看今天的结果");
await sleep(1000);
await shot(page, "12-final");

// 手机竖版：封面用
const m = await browser.newPage();
await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
await m.goto(BASE, { waitUntil: "networkidle2" });
await sleep(600);
await m.screenshot({ path: `${OUT}/13-mobile-landing.png` });
await m.evaluate(() => [...document.querySelectorAll("button")].find((x) => x.textContent.includes("免费体验"))?.click());
await sleep(1300);
await m.screenshot({ path: `${OUT}/14-mobile-play.png` });
console.log("· 13/14 mobile");

await browser.close();
