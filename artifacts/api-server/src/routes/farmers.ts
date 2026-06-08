import { Router, type IRouter } from "express";
import { eq, ilike, desc, or } from "drizzle-orm";
import { db, farmersTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/farmers", async (req, res): Promise<void> => {
  const search = req.query.search as string | undefined;
  const isActiveRaw = req.query.isActive as string | undefined;

  let farmers;

  if (search) {
    farmers = await db
      .select()
      .from(farmersTable)
      .where(
        or(
          ilike(farmersTable.phone, `%${search}%`),
          ilike(farmersTable.name, `%${search}%`),
          ilike(farmersTable.location, `%${search}%`)
        )
      )
      .orderBy(desc(farmersTable.lastSeen));
  } else if (isActiveRaw !== undefined) {
    farmers = await db
      .select()
      .from(farmersTable)
      .where(eq(farmersTable.isActive, isActiveRaw === "true"))
      .orderBy(desc(farmersTable.lastSeen));
  } else {
    farmers = await db.select().from(farmersTable).orderBy(desc(farmersTable.lastSeen));
  }

  res.json(
    farmers.map((f) => ({
      ...f,
      lastSeen: f.lastSeen.toISOString(),
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    }))
  );
});

router.get("/farmers/:phone", async (req, res): Promise<void> => {
  const phone = req.params.phone;
  const [farmer] = await db.select().from(farmersTable).where(eq(farmersTable.phone, phone));
  if (!farmer) {
    res.status(404).json({ error: "Farmer not found" });
    return;
  }
  res.json({
    ...farmer,
    lastSeen: farmer.lastSeen.toISOString(),
    createdAt: farmer.createdAt.toISOString(),
    updatedAt: farmer.updatedAt.toISOString(),
  });
});

router.patch("/farmers/:phone", async (req, res): Promise<void> => {
  const phone = req.params.phone;
  const body = req.body as {
    name?: string;
    location?: string;
    crops?: string[];
    livestock?: string[];
    languagePref?: "en" | "sn" | "nd";
    isActive?: boolean;
  };

  const [updated] = await db
    .update(farmersTable)
    .set({ ...body, updatedAt: new Date() })
    .where(eq(farmersTable.phone, phone))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Farmer not found" });
    return;
  }
  res.json({
    ...updated,
    lastSeen: updated.lastSeen.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
});

router.delete("/farmers/:phone", async (req, res): Promise<void> => {
  const phone = req.params.phone;
  await db.delete(farmersTable).where(eq(farmersTable.phone, phone));
  res.sendStatus(204);
});

export { router as farmersRouter };
