/**
 * 端到端冒烟测试：用本机 Chrome 打开开发服务器，按真实玩家路径跑完第一宗案件。
 * 运行：npm run smoke（需要先启动 npm run dev）
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:4176";
const CHROME =
  process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "shots";

mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function clickText(page, text, selector = "button, a") {
  const ok = await page.evaluate(
    (text, selector) => {
      const nodes = [...document.querySelectorAll(selector)].filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      const hit = nodes.find((el) =>
        el.textContent.replace(/\s+/g, "").includes(text.replace(/\s+/g, "")),
      );
      if (!hit) return false;
      hit.scrollIntoView({ block: "center" });
      hit.click();
      return true;
    },
    text,
    selector,
  );
  if (!ok) throw new Error(`未找到可点击元素：${text}`);
  await sleep(360);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--disable-gpu", "--hide-scrollbars"],
  defaultViewport: { width: 1440, height: 1000 },
});

const page = await browser.newPage();
const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(`页面异常：${err.message}`));

const log = (msg) => console.log(`· ${msg}`);

await page.goto(BASE, { waitUntil: "networkidle2" });
await page.evaluate(() => localStorage.clear());
await page.goto(BASE, { waitUntil: "networkidle2" });
await page.screenshot({ path: `${OUT}/01-landing.png` });
log("首页已加载");

await clickText(page, "开始调查");
await sleep(600);
await page.screenshot({ path: `${OUT}/02-briefing.png` });
log("入职页已加载");

await clickText(page, "进入档案室");
await sleep(900);
await page.screenshot({ path: `${OUT}/03-archive.png` });
log("档案室已加载");

await clickText(page, "消失的十元钱");
await sleep(700);
await page.screenshot({ path: `${OUT}/04-case-intro.png` });
log("档案封面已加载");

await clickText(page, "打开档案");
await sleep(800);
await page.screenshot({ path: `${OUT}/05-case.png` });
log("案件页已加载");

// 标记真正出错的句子
await page.evaluate(() => {
  const buttons = [...document.querySelectorAll('button[aria-pressed="false"]')];
  const hit = buttons.find(
    (b) => b.textContent.includes("88 元") && b.className.includes("text-left"),
  );
  hit?.click();
});
await sleep(300);
log("已标记错误句");

// 关键证据入板
await page.evaluate(() => {
  const cards = [...document.querySelectorAll("article")];
  const card = cards.find((el) => el.textContent.includes("订单结算明细"));
  const btn =
    card && [...card.querySelectorAll("button")].find((b) => b.textContent.includes("加入证据板"));
  btn?.click();
});
await sleep(400);
await page.screenshot({ path: `${OUT}/06-investigating.png` });
log("关键证据已入板");

await clickText(page, "计算错误");
await clickText(page, "提交裁决");
await page.waitForFunction(
  () =>
    document.body.innerText.includes("裁决成立") ||
    document.body.innerText.includes("裁决有偏差"),
  { timeout: 15000 },
);
await sleep(1000);
await page.screenshot({ path: `${OUT}/07-verdict.png`, fullPage: true });
log("裁决页已生成");

const verdictText = await page.evaluate(() => document.body.innerText);
const score = verdictText.match(/(\d{1,3})\s*\/\s*100/);
console.log(
  `  裁决：${verdictText.includes("裁决成立") ? "裁决成立" : "裁决有偏差"}，分数 ${score ? score[1] : "未知"}`,
);

// 手机端
const mobile = await browser.newPage();
mobile.on("pageerror", (err) => errors.push(`手机端异常：${err.message}`));
await mobile.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await mobile.goto(`${BASE}/cases/case-02`, { waitUntil: "networkidle2" });
await sleep(900);
await mobile.screenshot({ path: `${OUT}/08-mobile-intro.png`, fullPage: true });
await mobile.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    b.textContent.includes("打开档案"),
  );
  btn?.click();
});
await sleep(800);
await mobile.screenshot({ path: `${OUT}/09-mobile-case.png`, fullPage: false });
await mobile.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "裁决");
  btn?.click();
});
await sleep(500);
await mobile.screenshot({ path: `${OUT}/10-mobile-verdict-tab.png`, fullPage: true });
log("手机端已截图");

await browser.close();

if (errors.length) {
  console.log("\n浏览器控制台错误：");
  errors.forEach((e) => console.log("  - " + e));
  process.exitCode = 1;
} else {
  console.log("\n无控制台错误，冒烟测试通过。");
}
