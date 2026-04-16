import { and, asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, scenes, templates } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Projects
export async function createProject(userId: number, data: {
  title: string;
  description?: string;
  format: 'tiktok' | 'instagram_reels_9_16' | 'instagram_reels_1_1' | 'youtube_shorts';
  template: 'corporate' | 'modern' | 'minimalist';
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(projects).values({
    userId,
    title: data.title,
    description: data.description,
    format: data.format,
    template: data.template,
    status: 'draft',
  });

  // Get the inserted project
  const inserted = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt))
    .limit(1);

  return inserted[0] || null;
}

export async function getUserProjects(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.createdAt));

  return result;
}

export async function getProjectById(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function updateProject(projectId: number, userId: number, data: Partial<{
  title: string;
  description: string;
  status: 'draft' | 'generating' | 'completed' | 'failed';
  scriptContent: string;
  sceneImages: string;
  videoUrl: string;
  duration: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(projects)
    .set(data)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  return result;
}

export async function deleteProject(projectId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .delete(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, userId)));

  return result;
}

// Scenes
export async function createScene(projectId: number, data: {
  sceneNumber: number;
  title: string;
  description?: string;
  subtitles?: string;
  duration?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(scenes).values({
    projectId,
    sceneNumber: data.sceneNumber,
    title: data.title,
    description: data.description,
    subtitles: data.subtitles,
    duration: data.duration || 3,
  });

  return result;
}

export async function getProjectScenes(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(scenes)
    .where(eq(scenes.projectId, projectId))
    .orderBy(asc(scenes.sceneNumber));

  return result;
}

export async function updateScene(sceneId: number, data: Partial<{
  title: string;
  description: string;
  imageUrl: string;
  imagePrompt: string;
  subtitles: string;
  duration: number;
}>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .update(scenes)
    .set(data)
    .where(eq(scenes.id, sceneId));

  return result;
}

// Templates
export async function getTemplates() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.select().from(templates);
  return result;
}

export async function getTemplateByType(type: 'corporate' | 'modern' | 'minimalist') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(templates)
    .where(eq(templates.type, type))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}
