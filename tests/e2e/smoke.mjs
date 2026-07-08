import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 5177;
const URL = `http://127.0.0.1:${PORT}`;
const chromePath = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const screenshotDir = join(process.cwd(), "tmp", "e2e");
const viteCli = join(process.cwd(), "node_modules", "vite", "bin", "vite.js");
const serverOutput = [];
let serverExit = null;

await mkdir(screenshotDir, { recursive: true });

const server = spawn(process.execPath, [viteCli, "preview", "--configLoader", "native", "--host", "127.0.0.1", "--port", String(PORT)], {
  cwd: process.cwd(),
  stdio: "pipe",
});

server.stdout.on("data", (chunk) => serverOutput.push(chunk.toString()));
server.stderr.on("data", (chunk) => serverOutput.push(chunk.toString()));
server.on("exit", (code, signal) => {
  serverExit = { code, signal };
});

try {
  await waitForServer(URL);
  const browser = await chromium.launch({ headless: true, executablePath: chromePath });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const messages = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) messages.push(`${message.type()}: ${message.text()}`);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.getByTestId("start-run").click();
  await page.mouse.move(920, 420);
  await page.waitForTimeout(4500);
  await page.mouse.move(360, 420);
  await page.waitForSelector("[data-testid='shop-panel']", { timeout: 22000 });
  await page.screenshot({ path: join(screenshotDir, "shop.png") });

  const cashText = await page.getByTestId("cash-chip").textContent();
  const shopText = await page.getByTestId("shop-panel").textContent();
  const upgradeCardCount = await page.locator(".upgrade-card").count();
  const visibleShop = await page.getByTestId("shop-panel").isVisible();
  await browser.close();

  if (!visibleShop || !cashText?.includes("$")) throw new Error("Smoke flow did not reach a cash shop.");
  if (!shopText?.includes("Level Complete")) throw new Error("Shop did not show the completion summary.");
  if (upgradeCardCount !== 2) throw new Error(`Shop showed ${upgradeCardCount} upgrade choices instead of 2.`);
  if (messages.length > 0) throw new Error(`Console issues:\n${messages.join("\n")}`);
} finally {
  server.kill();
}

async function waitForServer(url) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    assertServerAlive();
    if (await canReach(url)) return;
    await delay(250);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function assertServerAlive() {
  if (!serverExit) return;
  throw new Error(`Vite exited early: ${JSON.stringify(serverExit)}\n${serverOutput.join("")}`);
}

async function canReach(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
