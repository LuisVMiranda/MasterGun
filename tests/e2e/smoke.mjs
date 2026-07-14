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
  await installSeedSave(page);
  const messages = [];
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) messages.push(`${message.type()}: ${message.text()}`);
  });

  await page.goto(URL, { waitUntil: "networkidle" });
  await assertLandscapeBackground(page);
  await assertModeSelect(page);
  await assertCanvasPixels(page);
  await page.screenshot({ path: join(screenshotDir, "mode-select.png") });
  await pressGamepad(page, 0);
  await page.waitForSelector("[data-testid='start-run']", { timeout: 2000 });
  await assertVisiblePanelPadding(page);
  await page.mouse.move(620, 360);
  await page.waitForTimeout(120);
  await assertTypographyRoles(page);
  await assertProfileTyping(page);
  await assertHintBadges(page);
  await assertLeaderboardButton(page);
  await assertSoundOptions(page);
  await assertLocalizedInfo(page);
  await assertControllerWeaponSelection(page);
  await assertPauseResume(page);
  await finishRun(page);
  await assertShopAndControllerNext(page);
  await assertAlternateModes(browser);
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
    window.__setMasterGunAxis = (index, value) => {
      window.__masterGunPad.axes[index] = value;
    };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [window.__masterGunPad] });
  });
}

async function installSeedSave(page) {
  await page.addInitScript(() => {
    if (localStorage.getItem("master-gun-save-v1")) return;
    localStorage.setItem("master-gun-save-v1", JSON.stringify({
      schemaVersion: 1,
      cash: 20000,
      level: 1,
      upgrades: {
        fireRate: 4,
        range: 6,
        ammo: 8,
        baseLife: 8,
        power: 8,
        wallDamage: 4,
        shieldDamage: 2,
        breachDamage: 2,
      },
      weaponsOwned: ["pistol", "shotgun", "machineGun"],
      equippedWeapon: "pistol",
      settings: { locale: "en" },
    }));
  });
}

async function installUnlockedSave(page) {
  await page.addInitScript(() => {
    if (localStorage.getItem("master-gun-save-v1")) return;
    localStorage.setItem("master-gun-save-v1", JSON.stringify({
      schemaVersion: 2,
      cash: 50000,
      level: 200,
      upgrades: {},
      weaponsOwned: ["pistol", "shotgun", "machineGun", "rifle"],
      equippedWeapon: "pistol",
      modeProgress: { arcade: { highestCleared: 200 } },
      settings: { locale: "en" },
    }));
  });
}

async function assertModeSelect(page) {
  const cards = page.locator(".mode-card");
  if (await cards.count() !== 5) throw new Error("Mode selector should show five image-backed operations.");
  if (await page.locator(".mode-card:disabled").count() !== 4) throw new Error("A fresh profile should unlock Arcade only.");
  const imagesReady = await cards.locator("img").evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth >= 1000));
  if (!imagesReady) throw new Error("One or more mode images failed to load at inspection resolution.");
  const padding = await page.getByTestId("mode-select").evaluate((element) => Number.parseFloat(window.getComputedStyle(element).paddingLeft));
  if (padding < 18) throw new Error(`Mode content is too close to its panel edge: ${padding}px`);
  await pressGamepad(page, 13);
  await assertControllerFocusHighlight(page, "modeSelect");
}

async function assertCanvasPixels(page) {
  await page.waitForTimeout(250);
  const isolation = await page.addStyleTag({ content: ".canvas-host{background:none!important}.canvas-host::before{display:none!important}" });
  const screenshot = await page.locator("canvas").screenshot({ omitBackground: true });
  await isolation.evaluate((element) => element.remove());
  const dataUrl = `data:image/png;base64,${screenshot.toString("base64")}`;
  const pixels = await page.evaluate(async (url) => {
    const image = new window.Image();
    image.src = url;
    await image.decode();
    const sample = window.document.createElement("canvas");
    sample.width = Math.min(320, image.width);
    sample.height = Math.min(180, image.height);
    const context = sample.getContext("2d");
    context.drawImage(image, 0, 0, sample.width, sample.height);
    const data = context.getImageData(0, 0, sample.width, sample.height).data;
    let opaque = 0;
    const colors = new Set();
    for (let index = 0; index < data.length; index += 16) {
      const isOpaque = data[index + 3] !== 0;
      opaque += Number(isOpaque);
      isOpaque && colors.add(`${data[index] >> 4}:${data[index + 1] >> 4}:${data[index + 2] >> 4}`);
    }
    return { opaque, colors: colors.size, total: data.length / 16 };
  }, dataUrl);
  if (pixels.opaque < pixels.total * 0.04 || pixels.colors < 4) throw new Error(`WebGL runway pixel check failed: ${JSON.stringify(pixels)}`);
}

async function assertProfileTyping(page) {
  await page.getByTestId("profile-name").click();
  await page.keyboard.type("Dado");
  const profileText = await page.getByTestId("profile-name").inputValue();
  if (profileText !== "Dado") throw new Error(`Profile input blocked typed movement keys: ${profileText}`);
}

async function assertSoundOptions(page) {
  await page.getByTestId("sound-button").click();
  await page.waitForSelector("[data-testid='sound-panel']", { timeout: 2000 });
  await assertVisiblePanelPadding(page);
  const ranges = page.getByTestId("sound-panel").locator("input[type='range']");
  if (await ranges.count() !== 3) throw new Error("Sound panel should expose master, music, and effects controls.");
  await page.locator("[data-audio-setting='masterVolume']").fill("35");
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("master-gun-save-v1")).settings.masterVolume);
  if (saved !== 0.35) throw new Error(`Master volume did not persist: ${saved}`);
  await page.locator("[data-action='closeSound']").click();
  await page.waitForSelector("[data-testid='sound-panel']", { state: "detached", timeout: 2000 });
}

async function assertLandscapeBackground(page) {
  const background = await page.getByTestId("canvas-host").evaluate((element) => {
    const host = window.getComputedStyle(element);
    const layer = window.getComputedStyle(element, "::before");
    const canvas = window.getComputedStyle(element.querySelector("canvas"));
    return {
      host: host.backgroundImage,
      layer: layer.backgroundImage,
      layerSize: layer.backgroundSize,
      layerRepeat: layer.backgroundRepeat,
      layerTop: layer.top,
      canvasBackground: canvas.backgroundColor,
    };
  });

  if (!background.layer.includes("sky-fields-background.jpg")) throw new Error(`Landscape layer missing: ${JSON.stringify(background)}`);
  if (!background.layerSize.includes("cover")) throw new Error(`Landscape layer is not stretch-cover sized: ${JSON.stringify(background)}`);
  if (!background.layerRepeat.split(",").every((value) => value.trim() === "no-repeat")) {
    throw new Error(`Landscape layer should never tile: ${JSON.stringify(background)}`);
  }
  if (!background.host.includes("linear-gradient")) throw new Error(`Sky gradient missing: ${JSON.stringify(background)}`);
  if (background.canvasBackground !== "rgba(0, 0, 0, 0)") throw new Error(`Canvas is not transparent: ${JSON.stringify(background)}`);
}

async function assertTypographyRoles(page) {
  await page.waitForFunction(() => document.fonts.check('700 24px "MasterGun Rajdhani"') && document.fonts.check('500 48px "MasterGun Tungsten Condensed"'));
  const roles = await page.evaluate(() => ({
    button: window.getComputedStyle(document.querySelector(".primary-button")).fontFamily,
    locale: window.getComputedStyle(document.querySelector("[data-testid='locale-select']")).fontFamily,
    title: window.getComputedStyle(document.querySelector("h1")).fontFamily,
  }));

  if (!roles.button.includes("MasterGun Rajdhani")) throw new Error(`Buttons are not using Rajdhani: ${roles.button}`);
  if (!roles.locale.includes("MasterGun Rajdhani")) throw new Error(`Language select is not using Rajdhani: ${roles.locale}`);
  if (!roles.title.includes("MasterGun Tungsten")) throw new Error(`Titles are not using Tungsten: ${roles.title}`);
}

async function assertHintBadges(page) {
  const hintText = await page.getByTestId("control-hints").textContent();
  const badgeCount = await page.locator(".control-hint-card kbd").count();
  if (!hintText?.includes("Mouse") || !hintText.includes("Click")) throw new Error(`Mouse hints missing: ${hintText}`);
  if (badgeCount < 2) throw new Error(`Expected highlighted hint badges, found ${badgeCount}.`);
}

async function assertLeaderboardButton(page) {
  if (!(await page.getByTestId("leaderboard-button").isVisible())) throw new Error("Leaderboard is not exposed as a compact button.");
  await page.getByTestId("leaderboard-button").click();
  await page.waitForSelector("[data-testid='leaderboard-panel']", { timeout: 2000 });
  await assertVisiblePanelPadding(page);
  await page.locator("[data-action='closeLeaderboard']").click();
}

async function assertLocalizedInfo(page) {
  await page.getByTestId("locale-select").selectOption("pt-BR");
  await pressGamepad(page, 8);
  await assertInfoPanel(page);
  await assertControllerFocusHighlight(page, "closeInfo");
  await pressGamepad(page, 3);
  await page.waitForSelector("[data-testid='info-panel']", { state: "detached", timeout: 2000 });
  await pressGamepad(page, 9);
  await assertMissionsPanel(page);
  await assertMissionFilters(page);
  await pressGamepad(page, 13);
  await assertControllerFocusHighlight(page);
  await pressGamepad(page, 3);
  await page.waitForSelector("[data-testid='missions-panel']", { state: "detached", timeout: 2000 });
  await page.getByTestId("locale-select").selectOption("en");
}

async function assertInfoPanel(page) {
  await assertVisiblePanelPadding(page);
  const infoText = await page.getByTestId("info-panel").textContent();
  const hintText = await page.getByTestId("control-hints").textContent();
  const hintMode = await page.locator(".control-hint-card").getAttribute("data-mode");
  if (hintMode !== "controller") throw new Error(`Controller hints did not activate: ${hintMode}`);
  if (!infoText?.includes("munição") || !infoText.includes("você")) throw new Error(`Portuguese info panel lost accented text: ${infoText}`);
  if (!hintText?.includes("X/A") || !hintText.includes("Triângulo")) throw new Error(`Controller hints did not show PS controls: ${hintText}`);
}

async function assertControllerFocusHighlight(page, action) {
  const focus = await page.evaluate(() => {
    const element = document.activeElement;
    const style = window.getComputedStyle(element);
    return {
      action: element?.dataset?.action,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
      source: document.querySelector(".game-shell")?.dataset?.inputSource,
    };
  });

  if (focus.source !== "controller") throw new Error(`Controller source was not active for focus highlight: ${JSON.stringify(focus)}`);
  if (action && focus.action !== action) throw new Error(`Expected ${action} to be focused: ${JSON.stringify(focus)}`);
  if (focus.outlineWidth === "0px" && focus.boxShadow === "none") throw new Error(`Focused control had no visible highlight: ${JSON.stringify(focus)}`);
}

async function assertMissionsPanel(page) {
  await assertVisiblePanelPadding(page);
  const missionText = await page.getByTestId("missions-panel").textContent();
  if (!missionText?.includes("Missões") || !missionText.includes("Caçador de munição")) throw new Error(`Portuguese mission panel lost localized text: ${missionText}`);
  const beforeScroll = await page.getByTestId("missions-panel").evaluate((element) => element.scrollTop);
  await moveGamepadAxis(page, 3, 1);
  const afterScroll = await page.getByTestId("missions-panel").evaluate((element) => element.scrollTop);
  if (afterScroll <= beforeScroll) throw new Error("Right stick did not scroll the missions panel.");
}

async function assertMissionFilters(page) {
  await page.locator("[data-filter='complete']").click();
  const completeCards = await page.locator(".mission-card").count();
  const incompleteInComplete = await page.locator(".mission-card:not(.is-complete)").count();
  if (incompleteInComplete !== 0) throw new Error(`Complete mission filter included ${incompleteInComplete} unfinished cards.`);
  await page.locator("[data-filter='incomplete']").click();
  const incompleteCards = await page.locator(".mission-card").count();
  const completeInIncomplete = await page.locator(".mission-card.is-complete").count();
  if (incompleteCards < 30) throw new Error(`Incomplete mission filter showed too few cards: ${incompleteCards}.`);
  if (completeInIncomplete !== 0) throw new Error(`Incomplete mission filter included ${completeInIncomplete} finished cards.`);
  await page.locator("[data-filter='all']").click();
  const allCards = await page.locator(".mission-card").count();
  if (allCards !== completeCards + incompleteCards) throw new Error(`Mission filters did not partition all cards: ${completeCards}+${incompleteCards} != ${allCards}.`);
}

async function assertControllerWeaponSelection(page) {
  await focusByData(page, { action: "equip", weapon: "machineGun" });
  await pressGamepad(page, 0);
  const weaponText = await page.locator(".weapon-panel h2").first().textContent();
  if (!weaponText?.includes("Machine Gun")) throw new Error(`Controller did not equip machine gun: ${weaponText}`);
  await focusByData(page, { action: "start" });
  await pressGamepad(page, 0);
}

async function assertPauseResume(page) {
  await pressGamepad(page, 9);
  await page.waitForSelector(".pause-panel", { timeout: 2000 });
  await pressGamepad(page, 0);
}

async function finishRun(page) {
  await page.mouse.move(920, 420);
  await page.waitForTimeout(4500);
  await assertToastStability(page);
  await page.mouse.move(360, 420);
  await page.waitForSelector("[data-testid='round-victory']", { timeout: 62000 });
  if (await page.getByTestId("shop-panel").count()) throw new Error("Shop appeared before the victory prompt was continued.");
  await page.waitForTimeout(2100);
  const lingeringToasts = await page.locator(".toast").count();
  if (lingeringToasts > 0) throw new Error(`End-of-round acquisition feed retained ${lingeringToasts} expired messages.`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(screenshotDir, "victory.png") });
  await pressGamepad(page, 13);
  await assertControllerFocusHighlight(page, "continueVictory");
  await pressGamepad(page, 0);
  await page.waitForSelector("[data-testid='achievement-victory']", { timeout: 2000 });
  if (await page.locator(".achievement-unlock-list article").count() < 1) throw new Error("Achievement celebration did not list the unlocked mission.");
  const rainbow = await page.getByTestId("achievement-victory").evaluate((element) => window.getComputedStyle(element, "::before").backgroundImage);
  if (!rainbow.includes("linear-gradient")) throw new Error(`Achievement celebration lost its rainbow bar: ${rainbow}`);
  await assertControllerFocusHighlight(page, "continueVictory");
  await page.screenshot({ path: join(screenshotDir, "achievement.png") });
  await pressGamepad(page, 0);
  await page.waitForSelector("[data-testid='shop-panel']", { timeout: 62000 });
  await page.screenshot({ path: join(screenshotDir, "shop.png") });
}

async function assertToastStability(page) {
  const toast = page.locator(".toast").last();
  await toast.waitFor({ state: "attached", timeout: 10000 });
  const messageId = await toast.getAttribute("data-message-id");
  if (!messageId) throw new Error("Acquisition toast is not keyed for stable rendering.");
  const original = await toast.elementHandle();
  await page.waitForTimeout(120);
  const stayedMounted = await original.evaluate((element) => element.isConnected);
  const sameMessageRemains = await page.locator(".toast").evaluateAll((nodes, id) => nodes.some((node) => node.dataset.messageId === id), messageId);
  if (!stayedMounted && sameMessageRemains) throw new Error("Acquisition toast was remounted and restarted its entrance animation.");
}

async function assertShopAndControllerNext(page) {
  await assertVisiblePanelPadding(page);
  const cashBeforeBuy = await readCash(page);
  await pressGamepad(page, 0);
  const cashAfterBuy = await readCash(page);
  const cashText = await page.getByTestId("cash-chip").textContent();
  const shopText = await page.getByTestId("shop-panel").textContent();
  const upgradeCardCount = await page.locator(".upgrade-card").count();
  const visibleShop = await page.getByTestId("shop-panel").isVisible();

  if (!visibleShop || !cashText?.includes("$")) throw new Error("Smoke flow did not reach a cash shop.");
  if (!hasShopSummaryHeading(shopText)) throw new Error(`Shop did not show a round summary: ${shopText}`);
  if (upgradeCardCount !== 2) throw new Error(`Shop showed ${upgradeCardCount} upgrade choices instead of 2.`);
  if (cashAfterBuy >= cashBeforeBuy) throw new Error("Controller confirm did not purchase a focused upgrade.");

  await focusByData(page, { action: "next" });
  await pressGamepad(page, 0);
  await page.waitForSelector("[data-testid='shop-panel']", { state: "hidden", timeout: 2000 });
}

async function assertAlternateModes(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installGamepadMock(page);
  await installUnlockedSave(page);
  await page.goto(URL, { waitUntil: "networkidle" });
  if (await page.locator(".mode-card:disabled").count() !== 0) throw new Error("Arcade 200 should unlock every operation.");

  await focusByData(page, { action: "modeSelect", mode: "weaponMastery" });
  await pressGamepad(page, 0);
  await page.waitForSelector(".mastery-lobby", { timeout: 2000 });
  await assertVisiblePanelPadding(page);
  if (await page.locator(".trial-button").count() !== 20) throw new Error("Mastery lobby did not expose twenty trials.");
  if (await page.locator(".trial-button:disabled").count() !== 19) throw new Error("Mastery trials should unlock sequentially.");
  await page.screenshot({ path: join(screenshotDir, "mastery-lobby.png") });

  await page.locator("[data-action='modeBack']").click();
  await page.locator("[data-mode='bossRush']").click();
  await assertVisiblePanelPadding(page);
  if (await page.locator(".fight-button").count() !== 25) throw new Error("Boss Rush lobby did not expose twenty-five engagements.");
  if (await page.locator(".fight-button:disabled").count() !== 24) throw new Error("Boss Rush engagements should unlock sequentially.");
  await page.screenshot({ path: join(screenshotDir, "boss-rush-lobby.png") });

  await page.locator("[data-action='modeBack']").click();
  await page.locator("[data-mode='weekly']").click();
  await assertVisiblePanelPadding(page);
  if (!(await page.getByText("3 attempts remaining").isVisible())) throw new Error("Weekly preview did not show its shared attempt budget.");
  await page.screenshot({ path: join(screenshotDir, "weekly-lobby.png") });
  await focusByData(page, { action: "start" });
  await pressGamepad(page, 0);
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(screenshotDir, "weekly-opening.png") });
  const spent = await page.evaluate(() => JSON.parse(localStorage.getItem("master-gun-save-v1")).modeProgress.weekly.attemptsUsed);
  if (spent !== 1) throw new Error(`Weekly launch did not spend exactly one attempt: ${spent}`);
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("[data-mode='weekly']").click();
  if (!(await page.getByText("2 attempts remaining").isVisible())) throw new Error("Refresh did not preserve the spent weekly attempt.");

  await page.locator("[data-action='modeBack']").click();
  await page.locator("[data-mode='endless']").click();
  await assertVisiblePanelPadding(page);
  if (!(await page.getByText("Begin an operation").isVisible())) throw new Error("Endless lobby did not offer a new operation.");
  await assertElementBounds(page, [".top-hud", ".mode-content-panel"]);
  await page.screenshot({ path: join(screenshotDir, "endless-lobby.png") });
  await page.close();
}

async function pressGamepad(page, buttonIndex) {
  await page.evaluate((index) => window.__setMasterGunButton(index, true), buttonIndex);
  await page.waitForTimeout(120);
  await page.evaluate((index) => window.__setMasterGunButton(index, false), buttonIndex);
  await page.waitForTimeout(180);
}

async function moveGamepadAxis(page, axisIndex, value, duration = 260) {
  await page.evaluate(([index, nextValue]) => window.__setMasterGunAxis(index, nextValue), [axisIndex, value]);
  await page.waitForTimeout(duration);
  await page.evaluate((index) => window.__setMasterGunAxis(index, 0), axisIndex);
  await page.waitForTimeout(80);
}

async function focusByData(page, expected, maxSteps = 14) {
  for (let step = 0; step < maxSteps; step += 1) {
    const focused = await getFocusedData(page);
    if (matchesFocusedData(focused, expected)) return;
    await pressGamepad(page, 13);
  }

  throw new Error(`Could not focus ${JSON.stringify(expected)} with controller. Current ${JSON.stringify(await getFocusedData(page))}`);
}

async function getFocusedData(page) {
  return page.evaluate(() => {
    const element = document.activeElement;
    const data = element?.dataset ?? {};
    return { action: data.action, weapon: data.weapon, mode: data.mode, key: data.key, value: data.value };
  });
}

function matchesFocusedData(focused, expected) {
  return Object.entries(expected).every(([key, value]) => focused[key] === value);
}

async function readCash(page) {
  const cash = await page.getByTestId("cash-chip").textContent();
  return Number(cash.replace(/\D/g, ""));
}

function hasShopSummaryHeading(text = "") {
  return ["Level Complete", "Nível completo", "Nivel completo", "Run Failed", "Rodada falhou", "Ronda fallida"].some((heading) => text.includes(heading));
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
    await assertVisiblePanelPadding(page);
    await assertElementBounds(page, [".top-hud", ".panel"]);
    await page.screenshot({ path: join(screenshotDir, viewport.name) });
    await page.close();
  }
}

async function assertVisiblePanelPadding(page) {
  const issues = await page.locator(".panel:visible").evaluateAll((panels) => panels.flatMap((panel) => {
    const style = window.getComputedStyle(panel);
    const values = [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft].map(Number.parseFloat);
    return values.some((value) => value < 18) ? [{ className: panel.className, values }] : [];
  }));
  if (issues.length > 0) throw new Error(`Visible menu panels need at least 18px edge padding: ${JSON.stringify(issues)}`);
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
