import { ENTITY, TARGET_SCALE } from "../content/constants.js";
import { t } from "../content/i18n.js";
import { chooseTargetX, getGameplayEnd, randomOffset, START_Z } from "./roundPlacement.js";

const RECRUIT_LEVEL_OFFSET = new Set([0, 5]);

export function addRecruitEvents(entities, cursor, context, factories) {
  if (!shouldAddRecruitSection(context.profile.level)) return;

  const z = getRecruitZ(context.profile, context.bossZ);
  const x = randomOffset(context.random, 0.8);
  entities.push(createRecruiter(cursor, x, z, context.profile, context.locale));
  addPostRecruitPressure(entities, cursor, context, factories, z);
}

export function shouldAddRecruitSection(level) {
  return level >= 16 && RECRUIT_LEVEL_OFFSET.has(level % 11);
}

function addPostRecruitPressure(entities, cursor, context, factories, z) {
  const { profile, random } = context;
  const offsets = profile.challenge ? [8, 12, 16] : [7, 12, 18];
  entities.push(factories.createBarricade(cursor, chooseTargetX(random), z + offsets[0], profile.difficulty));
  addRecruitBlocker(entities, cursor, context, factories, z + offsets[1]);

  if (profile.level >= 55) {
    entities.push(factories.createEnemy(cursor, chooseTargetX(random), profile, z + offsets[2], "shield"));
    return;
  }

  entities.push(factories.createEnemy(cursor, chooseTargetX(random), profile, z + offsets[2], "brute"));
}

function addRecruitBlocker(entities, cursor, context, factories, z) {
  const { profile, random, locale } = context;
  if (profile.level >= 45) {
    entities.push(factories.createSolidWall(cursor, chooseTargetX(random), z, profile.difficulty, t(locale, "entity.wall")));
    return;
  }

  entities.push(factories.createBarricade(cursor, chooseTargetX(random), z, profile.difficulty));
}

function getRecruitZ(profile, bossZ) {
  if (bossZ) return Math.max(START_Z + 38, bossZ - 50);
  return Math.max(START_Z + 42, getGameplayEnd(profile) * 0.58);
}

function createRecruiter(cursor, x, z, profile, locale) {
  const recruitCap = getRecruitCap(profile);
  return {
    id: cursor.id++,
    type: ENTITY.RECRUITER,
    x,
    z,
    width: size(1.05),
    depth: size(0.66),
    label: t(locale, "entity.recruiter"),
    health: recruitCap,
    maxHealth: recruitCap,
    recruitCap,
    recruited: 0,
    value: 0,
    active: true,
  };
}

function getRecruitCap(profile) {
  if (profile.level >= 140) return 6;
  if (profile.level >= 70) return 5;
  return 4;
}

function size(value) {
  return Number((value * TARGET_SCALE).toFixed(3));
}
