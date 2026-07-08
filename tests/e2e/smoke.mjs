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
  await installGamepadMock(page);
  const messages = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) messages.push(`${message.type()}: ${message.text()}`);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  await page.getByTestId("profile-name").click();
  await page.keyboard.type("Dado");
  const profileText = await page.getByTestId("profile-name").inputValue();
  if (profileText !== "Dado") throw new Error(`Profile input blocked typed movement keys: ${profileText}`);

  await assertLocalizedInfo(page);
  await pressGamepad(page, 0);
  await pressGamepad(page, 9);
  await page.waitForSelector(".pause-panel", { timeout: 2000 });
  await pressGamepad(page, 0);
  await page.mouse.move(920, 420);
  await page.waitForTimeout(4500);
  await page.mouse.move(360, 420);
  await page.waitForSelector("[data-testid='shop-panel']", { timeout: 62000 });
  await page.screenshot({ path: join(screenshotDir, "shop.png") });

  const cashBeforeBuy = await readCash(page);
  await pressGamepad(page, 0);
  const cashAfterBuy = await readCash(page);
  const cashText = await page.getByTestId("cash-chip").textContent();
  const shopText = await page.getByTestId("shop-panel").textContent();
  const upgradeCardCount = await page.locator(".upgrade-card").count();
  const visibleShop = await page.getByTestId("shop-panel").isVisible();

  if (!visibleShop || !cashText?.includes("$")) throw new Error("Smoke flow did not reach a cash shop.");
  if (!shopText?.includes("Level Complete")) throw new Error("Shop did not show the completion summary.");
  if (upgradeCardCount !== 2) throw new Error(`Shop showed ${upgradeCardCount} upgrade choices instead of 2.`);
  if (cashAfterBuy >= cashBeforeBuy) throw new Error("Controller confirm did not purchase a focused upgrade.");
  await assertResponsiveShell(browser);
  await browser.close();
  if (messages.length > 0) throw new Error(`Console issues:\n${messages.join("\n")}`);
} finally {
  server.kill();
}

async function installGamepadMock(page) {
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
    window.__masterGunPad = { axes: [0, 0], buttons };
    window.__setMasterGunButton = (index, pressed) => {
      window.__masterGunPad.buttons[index].pressed = pressed;
    };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [window.__masterGunPad] });
  });
}

async function pressGamepad(page, buttonIndex) {
  await page.evaluate((index) => window.__setMasterGunButton(index, true), buttonIndex);
  await page.waitForTimeout(120);
  await page.evaluate((index) => window.__setMasterGunButton(index, false), buttonIndex);
  await page.waitForTimeout(180);
}

async function assertLocalizedInfo(page) {
  await page.getByTestId("locale-select").selectOption("pt-BR");
  await page.getByTestId("info-button").click();
  const infoText = await page.getByTestId("info-panel").textContent();
  if (!infoText?.includes("munição") || !infoText.includes("você")) {
    throw new Error(`Portuguese info panel lost accented text: ${infoText}`);
  }
  await page.locator("[data-action='closeInfo']").click();
  await page.getByTestId("locale-select").selectOption("en");
}

async function readCash(page) {
  const cash = await page.getByTestId("cash-chip").textContent();
  return Number(cash.replace(/\D/g, ""));
}

async function assertResponsiveShell(browser) {
  const viewports = [
    { name: "mobile-menu.png", width: 390, height: 844 },
    { name: "tablet-menu.png", width: 820, height: 1180 },
    { name: "tv-menu.png", width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(URL, { waitUntil: "networkidle" });
    await assertElementBounds(page, [".top-hud", ".panel"]);
    await page.screenshot({ path: join(screenshotDir, viewport.name) });
    await page.close();
  }
}

async function assertElementBounds(page, selectors) {
  const bounds = await page.evaluate((items) => {
    return items
      .map((selector) => {
        const element = document.querySelector(selector);
        const rect = element?.getBoundingClientRect();
        return rect
          ? { selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: window.innerWidth, height: window.innerHeight }
          : { selector, missing: true };
      })
      .filter(Boolean);
  }, selectors);
  const issues = bounds.map(getBoundsIssue).filter(Boolean);

  if (issues.length > 0) throw new Error(`Responsive shell issues:\n${issues.join("\n")}`);
}

function getBoundsIssue(bounds) {
  if (bounds.missing) return `${bounds.selector} missing`;
  const overflowX = bounds.left < -1 || bounds.right > bounds.width + 1;
  const overflowY = bounds.top < -1 || bounds.bottom > bounds.height + 1;
  return overflowX || overflowY ? `${bounds.selector} out of bounds ${JSON.stringify(bounds)}` : "";
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
