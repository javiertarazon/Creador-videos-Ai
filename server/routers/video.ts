import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { renderAdvancedVideo, renderVideoWithNarration } from "../advancedVideoRender";
import { generateNarrationsForScenes, getAvailableVoices } from "../ttsService";
import {
  getAllMusic,
  getAvailableGenres,
  getAvailableMoods,
  getRecommendedMusic,
} from "../musicLibrary";

export const videoRouter = router({
  /**
   * Renderiza un video avanzado con animaciones y transiciones
   */
  renderAdvanced: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        format: z.enum(["tiktok", "instagram", "youtube"]),
        scenes: z.array(
          z.object({
            imageUrl: z.string(),
            duration: z.number(),
            text: z.string(),
            subtitle: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const outputPath = `/tmp/video-${Date.now()}.mp4`;
        const videoUrl = await renderAdvancedVideo(
          input.scenes,
          input.format,
          outputPath
        );

        return {
          success: true,
          videoUrl,
          format: input.format,
        };
      } catch (error) {
        console.error("[Video] Error renderizando video:", error);
        throw new Error("Error al renderizar el video");
      }
    }),

  /**
   * Genera narración de voz para las escenas
   */
  generateNarration: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        scenes: z.array(
          z.object({
            subtitle: z.string(),
            duration: z.number(),
          })
        ),
        voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const narrations = await generateNarrationsForScenes(input.scenes, input.voice);

        return {
          success: true,
          narrations,
          voice: input.voice,
        };
      } catch (error) {
        console.error("[TTS] Error generando narración:", error);
        throw new Error("Error al generar la narración");
      }
    }),

  /**
   * Renderiza video con narración y música
   */
  renderWithAudio: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        videoUrl: z.string(),
        narrationUrl: z.string().optional(),
        musicUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const outputPath = `/tmp/video-audio-${Date.now()}.mp4`;
        const videoUrl = await renderVideoWithNarration(
          input.videoUrl,
          input.narrationUrl || "",
          input.musicUrl || null,
          outputPath
        );

        return {
          success: true,
          videoUrl,
        };
      } catch (error) {
        console.error("[Video] Error renderizando con audio:", error);
        throw new Error("Error al renderizar el video con audio");
      }
    }),

  /**
   * Obtiene voces disponibles para TTS
   */
  getAvailableVoices: protectedProcedure.query(() => {
    return getAvailableVoices();
  }),

  /**
   * Obtiene toda la música disponible
   */
  getAllMusic: protectedProcedure.query(() => {
    return getAllMusic();
  }),

  /**
   * Obtiene géneros de música disponibles
   */
  getGenres: protectedProcedure.query(() => {
    return getAvailableGenres();
  }),

  /**
   * Obtiene moods de música disponibles
   */
  getMoods: protectedProcedure.query(() => {
    return getAvailableMoods();
  }),

  /**
   * Obtiene música recomendada para un tipo de video
   */
  getRecommendedMusic: protectedProcedure
    .input(z.object({ videoType: z.string() }))
    .query(({ input }) => {
      return getRecommendedMusic(input.videoType);
    }),

  /**
   * Exporta video a múltiples formatos en paralelo
   */
  exportMultiFormat: protectedProcedure
    .input(
      z.object({
        projectId: z.number(),
        scenes: z.array(
          z.object({
            imageUrl: z.string(),
            duration: z.number(),
            text: z.string(),
            subtitle: z.string(),
          })
        ),
        formats: z.array(z.enum(["tiktok", "instagram", "youtube"])),
        narrationUrl: z.string().optional(),
        musicUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const results: Record<string, string> = {};

        // Renderizar para cada formato en paralelo
        const renderPromises = input.formats.map(async (format) => {
          try {
            const outputPath = `/tmp/video-${format}-${Date.now()}.mp4`;
            const videoUrl = await renderAdvancedVideo(
              input.scenes,
              format,
              outputPath
            );

            // Si hay narración o música, renderizar con audio
            if (input.narrationUrl || input.musicUrl) {
              const finalPath = `/tmp/video-final-${format}-${Date.now()}.mp4`;
              const finalUrl = await renderVideoWithNarration(
                videoUrl,
                input.narrationUrl || "",
                input.musicUrl || null,
                finalPath
              );
              results[format] = finalUrl;
            } else {
              results[format] = videoUrl;
            }
          } catch (error) {
            console.error(`[Video] Error en formato ${format}:`, error);
            results[format] = "";
          }
        });

        await Promise.all(renderPromises);

        return {
          success: true,
          videos: results,
          formats: input.formats,
        };
      } catch (error) {
        console.error("[Video] Error exportando multi-formato:", error);
        throw new Error("Error al exportar a múltiples formatos");
      }
    }),
});

export type VideoRouter = typeof videoRouter;
