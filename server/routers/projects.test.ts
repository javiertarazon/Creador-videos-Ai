import { describe, expect, it, beforeEach, vi } from 'vitest';
import { projectsRouter } from './projects';
import type { TrpcContext } from '../_core/context';

// Mock user context
const createMockContext = (userId: number = 1): TrpcContext => ({
  user: {
    id: userId,
    openId: `user-${userId}`,
    email: `user${userId}@example.com`,
    name: `User ${userId}`,
    loginMethod: 'manus',
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  },
  req: {
    protocol: 'https',
    headers: {},
  } as any,
  res: {
    clearCookie: vi.fn(),
  } as any,
});

describe('projectsRouter', () => {
  describe('create', () => {
    it('should create a project with valid input', async () => {
      const ctx = createMockContext();
      const caller = projectsRouter.createCaller(ctx);

      const result = await caller.create({
        title: 'Test Project',
        description: 'A test project',
        format: 'tiktok',
        template: 'modern',
      });

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('projectId');
      expect(typeof result.projectId).toBe('number');
      expect(result.projectId).toBeGreaterThan(0);
    });

    it('should reject empty title', async () => {
      const ctx = createMockContext();
      const caller = projectsRouter.createCaller(ctx);

      try {
        await caller.create({
          title: '',
          description: 'A test project',
          format: 'tiktok',
          template: 'modern',
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('title');
      }
    });
  });

  describe('list', () => {
    it('should return empty array for user with no projects', async () => {
      const ctx = createMockContext(999);
      const caller = projectsRouter.createCaller(ctx);

      const result = await caller.list();

      expect(Array.isArray(result)).toBe(true);
    });

    it('should return projects for user', async () => {
      const ctx = createMockContext();
      const caller = projectsRouter.createCaller(ctx);

      // Create a project first
      await caller.create({
        title: 'Test Project',
        description: 'A test project',
        format: 'tiktok',
        template: 'modern',
      });

      const result = await caller.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('title', 'Test Project');
      expect(result[0]).toHaveProperty('userId');
    });
  });

  describe('getById', () => {
    it('should return project details', async () => {
      const ctx = createMockContext();
      const caller = projectsRouter.createCaller(ctx);

      // Create a project first
      const createResult = await caller.create({
        title: 'Test Project',
        description: 'A test project',
        format: 'tiktok',
        template: 'modern',
      });

      const result = await caller.getById({ projectId: createResult.projectId });

      expect(result).toHaveProperty('id', createResult.projectId);
      expect(result).toHaveProperty('title', 'Test Project');
      expect(result).toHaveProperty('format', 'tiktok');
      expect(result).toHaveProperty('template', 'modern');
    });

    it('should throw error for non-existent project', async () => {
      const ctx = createMockContext();
      const caller = projectsRouter.createCaller(ctx);

      try {
        await caller.getById({ projectId: 99999 });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('Project not found');
      }
    });
  });

  describe('delete', () => {
    it('should delete a project', async () => {
      const ctx = createMockContext();
      const caller = projectsRouter.createCaller(ctx);

      // Create a project first
      const createResult = await caller.create({
        title: 'Test Project',
        description: 'A test project',
        format: 'tiktok',
        template: 'modern',
      });

      // Delete it
      const deleteResult = await caller.delete({ projectId: createResult.projectId });

      expect(deleteResult).toHaveProperty('success', true);
    });
  });

  describe('duplicate', () => {
    it('should duplicate a project', async () => {
      const ctx = createMockContext();
      const caller = projectsRouter.createCaller(ctx);

      // Create a project first
      const createResult = await caller.create({
        title: 'Original Project',
        description: 'A test project',
        format: 'tiktok',
        template: 'modern',
      });

      // Duplicate it
      const duplicateResult = await caller.duplicate({ projectId: createResult.projectId });

      expect(duplicateResult).toHaveProperty('success', true);
      expect(duplicateResult).toHaveProperty('projectId');

      // Verify the duplicate was created
      const duplicatedProject = await caller.getById({ projectId: duplicateResult.projectId });
      expect(duplicatedProject).toHaveProperty('title');
      expect(duplicatedProject).toBeDefined();
    });
  });
});
