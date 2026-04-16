import { generateImage } from './_core/imageGeneration';
import { storagePut } from './storage';

interface ImageGenerationProgress {
  sceneNumber: number;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  error?: string;
  progress: number;
}

/**
 * Genera imágenes para todas las escenas de un proyecto
 */
export async function generateProjectImages(
  projectId: number,
  userId: number,
  scriptContent: any
): Promise<Record<number, string>> {
  const sceneImages: Record<number, string> = {};

  if (!scriptContent?.scenes) {
    throw new Error('No scenes found in script');
  }

  for (const scene of scriptContent.scenes) {
    try {
      const imageUrl = await generateSceneImage(
        projectId,
        userId,
        scene.sceneNumber,
        scene.description
      );
      sceneImages[scene.sceneNumber] = imageUrl;
    } catch (error: any) {
      console.error(`Error generating image for scene ${scene.sceneNumber}:`, error);
      throw error;
    }
  }

  return sceneImages;
}

/**
 * Genera imagen para una escena individual
 */
export async function generateSceneImage(
  projectId: number,
  userId: number,
  sceneNumber: number,
  sceneDescription: string
): Promise<string> {
  try {
    const prompt = `${sceneDescription}. Professional, high-quality, cinematic style.`;
    const result = await generateImage({ prompt });

    if (!result.url) {
      throw new Error('No image URL returned from generation');
    }

    // Guardar imagen en S3
    const imageKey = `images/${userId}/project-${projectId}/scene-${sceneNumber}-${Date.now()}.jpg`;
    const imageBuffer = await fetch(result.url).then(r => r.arrayBuffer());
    const storageResult = await storagePut(imageKey, Buffer.from(imageBuffer), 'image/jpeg');

    return storageResult.url;
  } catch (error) {
    console.error('Error generating scene image:', error);
    throw error;
  }
}

/**
 * Valida que todas las escenas tengan imágenes
 */
export function validateAllImagesGenerated(
  scriptContent: any,
  sceneImages: Record<number, string>
): boolean {
  if (!scriptContent?.scenes) return false;

  return scriptContent.scenes.every((scene: any) => {
    const imageUrl = sceneImages[scene.sceneNumber];
    return imageUrl && imageUrl.trim().length > 0;
  });
}

/**
 * Obtiene el progreso de generación de imágenes
 */
export function getImageGenerationProgress(
  scriptContent: any,
  sceneImages: Record<number, string>
): number {
  if (!scriptContent?.scenes || scriptContent.scenes.length === 0) return 0;

  const generatedCount = scriptContent.scenes.filter(
    (scene: any) => sceneImages[scene.sceneNumber]
  ).length;

  return Math.round((generatedCount / scriptContent.scenes.length) * 100);
}
