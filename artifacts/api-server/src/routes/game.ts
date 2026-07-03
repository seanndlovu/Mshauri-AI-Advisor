import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, gameStatsTable } from "@workspace/db";

const router: IRouter = Router();

const LEVELS = [
  { level: 1, title: "Seed Farmer",        min: 0     },
  { level: 2, title: "Smallholder",         min: 500   },
  { level: 3, title: "Field Farmer",        min: 1500  },
  { level: 4, title: "Crop Specialist",     min: 3000  },
  { level: 5, title: "Agronomy Expert",     min: 5500  },
  { level: 6, title: "Senior Grower",       min: 9000  },
  { level: 7, title: "Field Expert",        min: 14000 },
  { level: 8, title: "Master Farmer",       min: 20000 },
  { level: 9, title: "Agricultural Advisor",min: 28000 },
  { level: 10,title: "Mshauri Champion",    min: 38000 },
];

function getLevelInfo(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) {
    if (xp >= l.min) current = l;
  }
  const nextIdx = LEVELS.findIndex(l => l.level === current.level) + 1;
  const next = LEVELS[nextIdx] ?? null;
  const xpInLevel = xp - current.min;
  const xpForNext = next ? next.min - current.min : 1;
  return { ...current, nextLevel: next?.title ?? null, xpInLevel, xpForNext };
}

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

router.get("/game/stats", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  if (!userId) { res.json(null); return; }
  const [row] = await db.select().from(gameStatsTable).where(eq(gameStatsTable.userId, userId)).limit(1);
  if (!row) { res.json({ xp: 0, level: 1, levelTitle: "Seed Farmer", streak: 0, totalGames: 0, lastPlayedDate: null, levelInfo: getLevelInfo(0) }); return; }
  res.json({ ...row, levelInfo: getLevelInfo(row.xp) });
});

router.post("/game/complete", async (req, res): Promise<void> => {
  const userId = req.session?.userId;
  const { xpEarned } = req.body as { xpEarned: number };
  if (!userId || typeof xpEarned !== "number") { res.status(400).json({ error: "invalid" }); return; }

  const today = todayDate();
  const [existing] = await db.select().from(gameStatsTable).where(eq(gameStatsTable.userId, userId)).limit(1);

  if (!existing) {
    const newXp = Math.max(0, xpEarned);
    const levelInfo = getLevelInfo(newXp);
    const [row] = await db.insert(gameStatsTable).values({
      userId,
      xp: newXp,
      level: levelInfo.level,
      streak: 1,
      lastPlayedDate: today,
      totalGames: 1,
    }).returning();
    res.json({ ...row, levelInfo });
    return;
  }

  const lastPlayed = existing.lastPlayedDate;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const alreadyPlayedToday = lastPlayed === today;
  const newStreak = alreadyPlayedToday
    ? existing.streak
    : lastPlayed === yesterdayStr
    ? existing.streak + 1
    : 1;

  const newXp = existing.xp + (alreadyPlayedToday ? 0 : xpEarned);
  const levelInfo = getLevelInfo(newXp);

  const [row] = await db.update(gameStatsTable).set({
    xp: newXp,
    level: levelInfo.level,
    streak: newStreak,
    lastPlayedDate: today,
    totalGames: existing.totalGames + 1,
  }).where(eq(gameStatsTable.userId, userId)).returning();

  res.json({ ...row, levelInfo, alreadyPlayedToday });
});

export { router as gameRouter };
