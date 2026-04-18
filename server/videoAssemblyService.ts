import { storagePut } from './storage';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

interface VideoAssemblyOptions {
  projectId: number;
  userId: number;
  scenes: any[];
  template: 'corporate' | 'modern' | 'minimalist';
  format: 'tiktok' | 'instagram_reels_9_16' | 'instagram_reels_1_1' | 'youtube_shorts';
}

const getFormatDimensions = (format: string) => {
  const formats: Record<string, { width: number; height: number }> = {
    tiktok: { width: 1080, height: 1920 },
    instagram_reels_9_16: { width: 1080, height: 1920 },
    instagram_reels_1_1: { width: 1080, height: 1080 },
    youtube_shorts: { width: 1080, height: 1920 },
  };
  return formats[format] || { width: 1080, height: 1920 };
};

/**
 * Ensambla un video a partir de imágenes y subtítulos
 * Utiliza FFmpeg para crear el video final
 */
export async function assembleVideo(options: VideoAssemblyOptions): Promise<string> {
  const { projectId, userId, scenes, template, format } = options;

  try {
    const dimensions = getFormatDimensions(format);
    const tempDir = path.join(os.tmpdir(), `video-${projectId}-${Date.now()}`);
    
    // Crear directorio temporal
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Crear archivo de lista para FFmpeg
    const listFile = path.join(tempDir, 'images.txt');
    let listContent = '';

    for (const scene of scenes) {
      if (!scene.imageUrl) {
        throw new Error(`Scene ${scene.sceneNumber} missing image URL`);
      }

      // Descargar imagen
      const imagePath = path.join(tempDir, `scene-${scene.sceneNumber}.jpg`);
      const imageResponse = await fetch(scene.imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image for scene ${scene.sceneNumber}: ${imageResponse.statusText}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      if (imageBuffer.byteLength === 0) {
        throw new Error(`Downloaded image for scene ${scene.sceneNumber} is empty`);
      }
      
      fs.writeFileSync(imagePath, Buffer.from(imageBuffer));

      // Agregar a lista de FFmpeg (duración en segundos)
      listContent += `file '${imagePath}'\nduration ${scene.duration || 3}\n`;
    }

    fs.writeFileSync(listFile, listContent);

    // Crear video con FFmpeg
    const outputPath = path.join(tempDir, 'output.mp4');
    const ffmpegCommand = `ffmpeg -f concat -safe 0 -i "${listFile}" -c:v libx264 -pix_fmt yuv420p -vf "scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2" -r 30 -vsync vfr -y "${outputPath}"`;

    try {
      await execAsync(ffmpegCommand);
    } catch (ffmpegError) {
      throw new Error(`FFmpeg error: ${ffmpegError instanceof Error ? ffmpegError.message : String(ffmpegError)}`);
    }

    // Verificar que el archivo se creó
    if (!fs.existsSync(outputPath)) {
      throw new Error('Video file was not created');
    }

    // Subir video a S3
    const videoKey = `videos/${userId}/project-${projectId}-${Date.now()}.mp4`;
    const videoBuffer = fs.readFileSync(outputPath);
    const storageResult = await storagePut(videoKey, videoBuffer, 'video/mp4');

    // Limpiar archivos temporales
    fs.rmSync(tempDir, { recursive: true, force: true });

    return storageResult.url;
  } catch (error) {
    console.error('Error assembling video:', error);
    throw new Error(`Failed to assemble video: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Obtiene la duración total del video en segundos
 */
export function getVideoTotalDuration(scenes: any[]): number {
  return scenes.reduce((sum, scene) => sum + (scene.duration || 3), 0);
}

/**
 * Valida que todas las escenas tengan imágenes
 */
export function validateScenesForAssembly(scenes: any[]): boolean {
  return scenes.every(scene => scene.imageUrl && scene.imageUrl.trim());
}
