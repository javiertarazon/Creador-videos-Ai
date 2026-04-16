import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import {
  createProject,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  createScene,
  getProjectScenes,
  updateScene,
} from '../db';
import { invokeLLM } from '../_core/llm';
import { generateImage } from '../_core/imageGeneration';
import { generateScriptPrompt, parseScriptFromLLM } from '../scriptTypes';

export const projectsRouter = router({
  /**
   * Crear un nuevo proyecto
   */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        format: z.enum(['tiktok', 'instagram_reels_9_16', 'instagram_reels_1_1', 'youtube_shorts']),
        template: z.enum(['corporate', 'modern', 'minimalist']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await createProject(ctx.user.id, {
        title: input.title,
        description: input.description,
        format: input.format,
        template: input.template,
      });

      return { success: true, projectId: result?.id ?? 0 };
    }),

  /**
   * Obtener lista de proyectos del usuario
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    const projects = await getUserProjects(ctx.user.id);
    return projects.map(p => ({
      ...p,
      scriptContent: p.scriptContent ? JSON.parse(p.scriptContent) : null,
      sceneImages: p.sceneImages ? JSON.parse(p.sceneImages) : null,
    }));
  }),

  /**
   * Obtener detalles de un proyecto
   */
  getById: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .query(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new Error('Project not found');
      }

      const scenes = await getProjectScenes(input.projectId);

      return {
        ...project,
        scriptContent: project.scriptContent ? JSON.parse(project.scriptContent) : null,
        sceneImages: project.sceneImages ? JSON.parse(project.sceneImages) : null,
        scenes,
      };
    }),

  /**
   * Actualizar proyecto
   */
  update: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        template: z.enum(['corporate', 'modern', 'minimalist']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: any = {};
      if (input.title) updateData.title = input.title;
      if (input.description) updateData.description = input.description;
      if (input.template) updateData.template = input.template;
      await updateProject(input.projectId, ctx.user.id, updateData);

      return { success: true };
    }),

  /**
   * Duplicar proyecto
   */
  duplicate: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const original = await getProjectById(input.projectId, ctx.user.id);
      if (!original) {
        throw new Error('Project not found');
      }

      const result = await createProject(ctx.user.id, {
        title: `${original.title} (Copy)`,
        description: original.description || undefined,
        format: original.format as any,
        template: original.template as any,
      });

      return { success: true, projectId: result?.id ?? 0 };
    }),

  /**
   * Eliminar proyecto
   */
  delete: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await deleteProject(input.projectId, ctx.user.id);
      return { success: true };
    }),

  /**
   * Generar guión con IA
   */
  generateScript: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        topic: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new Error('Project not found');
      }

      await updateProject(input.projectId, ctx.user.id, { status: 'generating' });

      try {
        const prompt = generateScriptPrompt(input.topic, project.format);

        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are a professional video script writer. Generate structured video scripts in JSON format.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const scriptText = typeof response.choices[0]?.message.content === 'string'
          ? response.choices[0].message.content
          : '';
        const scriptContent = parseScriptFromLLM(scriptText);

        await updateProject(input.projectId, ctx.user.id, {
          scriptContent: JSON.stringify(scriptContent),
          status: 'draft',
        });

        for (const scene of scriptContent.scenes) {
          await createScene(input.projectId, {
            sceneNumber: scene.sceneNumber,
            title: scene.title,
            description: scene.description,
            subtitles: scene.subtitles,
            duration: scene.duration,
          });
        }

        return {
          success: true,
          script: scriptContent,
        };
      } catch (error) {
        await updateProject(input.projectId, ctx.user.id, { status: 'failed' });
        throw error;
      }
    }),

  /**
   * Generar imágenes para todas las escenas
   */
  generateImages: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.scriptContent) {
        throw new Error('No script found. Generate a script first.');
      }

      const scriptContent = JSON.parse(project.scriptContent);
      const sceneImages: Record<number, string> = {};

      try {
        for (const scene of scriptContent.scenes) {
          const imageResult = await generateImage({
            prompt: scene.description,
          });

          if (imageResult.url) {
            sceneImages[scene.sceneNumber] = imageResult.url;
          }

          const scenes = await getProjectScenes(input.projectId);
          const sceneRecord = scenes.find(s => s.sceneNumber === scene.sceneNumber);
          if (sceneRecord) {
            await updateScene(sceneRecord.id, {
              imageUrl: imageResult.url,
            });
          }
        }

        await updateProject(input.projectId, ctx.user.id, {
          sceneImages: JSON.stringify(sceneImages),
        });

        return {
          success: true,
          images: sceneImages,
        };
      } catch (error) {
        throw error;
      }
    }),

  /**
   * Regenerar imagen de una escena específica
   */
  regenerateSceneImage: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        sceneNumber: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.scriptContent) {
        throw new Error('No script found.');
      }

      const scriptContent = JSON.parse(project.scriptContent);
      const scene = scriptContent.scenes.find((s: any) => s.sceneNumber === input.sceneNumber);

      if (!scene) {
        throw new Error('Scene not found.');
      }

      try {
        const imageResult = await generateImage({
          prompt: scene.description,
        });

        const scenes = await getProjectScenes(input.projectId);
        const sceneRecord = scenes.find(s => s.sceneNumber === input.sceneNumber);
        if (sceneRecord) {
          await updateScene(sceneRecord.id, {
            imageUrl: imageResult.url,
          });
        }

        const sceneImages = project.sceneImages ? JSON.parse(project.sceneImages) : {};
        sceneImages[input.sceneNumber] = imageResult.url;
        await updateProject(input.projectId, ctx.user.id, {
          sceneImages: JSON.stringify(sceneImages),
        });

        return {
          success: true,
          imageUrl: imageResult.url,
        };
      } catch (error) {
        throw error;
      }
    }),

  /**
   * Ensamblar video a partir de imágenes
   */
  assembleVideo: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId, ctx.user.id);
      if (!project) {
        throw new Error('Project not found');
      }

      if (!project.scriptContent) {
        throw new Error('No script found.');
      }

      const scriptContent = JSON.parse(project.scriptContent);
      const sceneImages = project.sceneImages ? JSON.parse(project.sceneImages) : {};

      const allScenesHaveImages = scriptContent.scenes.every((s: any) => sceneImages[s.sceneNumber]);
      if (!allScenesHaveImages) {
        throw new Error('Not all scenes have images. Generate images first.');
      }

      try {
        const { assembleVideo: assembleVideoService } = await import('../videoAssemblyService');

        const scenesWithImages = scriptContent.scenes.map((s: any) => ({
          ...s,
          imageUrl: sceneImages[s.sceneNumber],
        }));

        const videoUrl = await assembleVideoService({
          projectId: input.projectId,
          userId: ctx.user.id,
          scenes: scenesWithImages,
          template: project.template as any,
          format: project.format as any,
        });

        await updateProject(input.projectId, ctx.user.id, {
          videoUrl,
          status: 'completed',
        });

        return {
          success: true,
          videoUrl,
        };
      } catch (error) {
        console.error('Error assembling video:', error);
        throw error;
      }
    }),
});
