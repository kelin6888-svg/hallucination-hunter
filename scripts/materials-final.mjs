import puppeteer from "puppeteer-core";
const BASE = "http://127.0.0.1:4176";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--hide-scrollbars"],
  defaultViewport: { width: 1600, height: 900, deviceScaleFactor: 2 },
});
const p = await b.newPage();
const click = async (t) => {
  const ok = await p.evaluate((t) => {
    const n = (s) => s.replace(/\s+/g, "");
    const el = [...document.querySelectorAll("button,a")].find(
      (e) => e.getBoundingClientRect().width > 0 && n(e.textContent).includes(n(t)),
    );
    if (!el) return false;
    el.scrollIntoView({ block: "center" });
    el.click();
    return true;
  }, t);
  if (!ok) throw new Error("未找到 " + t);
  await sleep(700);
};
await p.goto(BASE, { waitUntil: "networkidle2" });
await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: "networkidle2" });
await click("免费体验");
await click("查看官方订单");
await click("查看发消息的账号");
await click("回官方页面重新下单");
await click("继续下一件事");
await click("气泡水 39 元"); await click("纸杯 25 元"); await click("饼干 19 元");
await click("查看优惠规则");
await click("去结算");
await click("继续下一件事");
await click("打开物流地图"); await click("查看完整物流记录");
await click("去城西配送站");
await click("继续下一件事");
await click("读一遍活动须知");
await click("直接登记报名");
await click("继续下一件事");
await click("现在出发");
await p.screenshot({ path: "shots/materials/15-bus.png" });
await click("查看今天的结果");
await sleep(1200);
await p.screenshot({ path: "shots/materials/16-final-good.png" });
console.log("done", await p.evaluate(() => document.body.innerText.slice(0, 60)));
await b.close();
