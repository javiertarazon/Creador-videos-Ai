import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { storagePut } from "./storage";

const execAsync = promisify(exec);

export interface AnimationConfig {
  type: "fade" | "slide" | "zoom" | "pan" | "typewriter";
  duration: number;
  delay?: number;
  direction?: "in" | "out";
}

export interface SceneWithAnimation {
  imageUrl: string;
  duration: number;
  text: string;
  subtitle: string;
  animation?: AnimationConfig;
  nextAnimation?: AnimationConfig;
}

/**
 * Renderiza un video profesional con FFmpeg avanzado
 * Incluye: transiciones, zoom/pan, subtítulos animados, texto dinámico
 */
export async function renderAdvancedVideo(
  scenes: SceneWithAnimation[],
  format: "tiktok" | "instagram" | "youtube",
  outputPath: string
): Promise<string> {
  const tempDir = `/tmp/video-render-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Descargar imágenes
    const downloadedImages: string[] = [];
    for (let i = 0; i < scenes.length; i++) {
      const imagePath = path.join(tempDir, `scene_${i}.jpg`);
      const response = await fetch(scenes[i].imageUrl);
      if (!response.ok) throw new Error(`Failed to download image ${i}`);
      const buffer = await response.arrayBuffer();
      fs.writeFileSync(imagePath, Buffer.from(buffer));
      downloadedImages.push(imagePath);
    }

    // Obtener dimensiones del formato
    const { width, height } = getFormatDimensions(format);

    // Crear filtro FFmpeg complejo con animaciones
    const filterComplex = buildFilterComplex(scenes, downloadedImages, width, height, format);

    // Construir comando FFmpeg
    let ffmpegCmd = "ffmpeg -y";

    // Agregar inputs
    downloadedImages.forEach((img) => {
      ffmpegCmd += ` -loop 1 -t ${getDurationForImage(scenes, downloadedImages.indexOf(img))} -i "${img}"`;
    });

    // Agregar filtro complejo
    ffmpegCmd += ` -filter_complex "${filterComplex}"`;

    // Configurar codec y output
    ffmpegCmd += ` -c:v libx264 -preset medium -crf 23 -c:a aac -b:a 128k "${outputPath}"`;

    console.log("[FFmpeg] Ejecutando comando:", ffmpegCmd.substring(0, 200) + "...");

    await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 });

    // Subir a S3
    const videoBuffer = fs.readFileSync(outputPath);
    const { url } = await storagePut(
      `videos/${Date.now()}-${format}.mp4`,
      videoBuffer,
      "video/mp4"
    );

    return url;
  } finally {
    // Limpiar archivos temporales
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  }
}

function getFormatDimensions(format: string): { width: number; height: number } {
  switch (format) {
    case "tiktok":
    case "instagram":
    case "youtube":
      return { width: 1080, height: 1920 }; // 9:16
    default:
      return { width: 1080, height: 1920 };
  }
}

function getDurationForImage(scenes: SceneWithAnimation[], index: number): number {
  return scenes[index]?.duration || 5;
}

function buildFilterComplex(
  scenes: SceneWithAnimation[],
  images: string[],
  width: number,
  height: number,
  format: string
): string {
  const filters: string[] = [];

  // Procesar cada escena
  images.forEach((img, idx) => {
    const scene = scenes[idx];
    const duration = scene.duration;

    // Escalar y centrar imagen
    filters.push(
      `[${idx}:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2[scene${idx}_scaled]`
    );

    // Agregar animación de entrada
    if (scene.animation?.type === "zoom") {
      filters.push(
        `[scene${idx}_scaled]scale=w='if(lt(t,${scene.animation.duration}),${width}+t*100,${width})':h='if(lt(t,${scene.animation.duration}),${height}+t*100,${height})',crop=${width}:${height}[scene${idx}_zoom]`
      );
    } else if (scene.animation?.type === "fade") {
      filters.push(
        `[scene${idx}_scaled]fade=t=in:st=0:d=${scene.animation.duration}[scene${idx}_fade]`
      );
    } else {
      filters.push(`[scene${idx}_scaled]copy[scene${idx}_fade]`);
    }

    // Agregar texto dinámico (subtítulos)
    if (scene.subtitle) {
      const textEscaped = scene.subtitle.replace(/'/g, "\\'").replace(/"/g, '\\"');
      filters.push(
        `[scene${idx}_fade]drawtext=text='${textEscaped}':fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:fontsize=40:fontcolor=white:x=(w-text_w)/2:y=h-100:shadowcolor=black:shadowx=2:shadowy=2[scene${idx}_text]`
      );
    } else {
      filters.push(`[scene${idx}_fade]copy[scene${idx}_text]`);
    }

    // Agregar transición a la siguiente escena
    if (idx < images.length - 1) {
      filters.push(
        `[scene${idx}_text][scene${idx + 1}_text]xfade=transition=fade:duration=0.5:offset=${duration - 0.5}[scene${idx}_transition]`
      );
    }
  });

  // Concatenar todas las escenas
  let concat = "";
  images.forEach((_, idx) => {
    concat += `[scene${idx}_text]`;
  });
  concat += `concat=n=${images.length}:v=1:a=0`;
  filters.push(concat);

  return filters.join(";");
}

/**
 * Renderiza un video con narración de voz
 */
export async function renderVideoWithNarration(
  videoUrl: string,
  narrationAudioUrl: string,
  backgroundMusicUrl: string | null,
  outputPath: string
): Promise<string> {
  const tempDir = `/tmp/video-narration-${Date.now()}`;
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    // Descargar archivos
    const videoPath = path.join(tempDir, "video.mp4");
    const narrationPath = path.join(tempDir, "narration.mp3");
    const musicPath = backgroundMusicUrl ? path.join(tempDir, "music.mp3") : null;

    await downloadFile(videoUrl, videoPath);
    await downloadFile(narrationAudioUrl, narrationPath);
    if (musicPath && backgroundMusicUrl) {
      await downloadFile(backgroundMusicUrl, musicPath);
    }

    // Construir comando FFmpeg para mezclar audio
    let ffmpegCmd = `ffmpeg -y -i "${videoPath}" -i "${narrationPath}"`;

    if (musicPath) {
      ffmpegCmd += ` -i "${musicPath}"`;
      // Mezclar narración (100%) + música (30%)
      ffmpegCmd += ` -filter_complex "[1:a]volume=1.0[narration];[2:a]volume=0.3[music];[narration][music]amix=inputs=2:duration=first[audio]" -map 0:v -map "[audio]"`;
    } else {
      ffmpegCmd += ` -map 0:v -map 1:a`;
    }

    ffmpegCmd += ` -c:v copy -c:a aac "${outputPath}"`;

    await execAsync(ffmpegCmd, { maxBuffer: 50 * 1024 * 1024 });

    // Subir a S3
    const videoBuffer = fs.readFileSync(outputPath);
    const { url } = await storagePut(
      `videos/with-narration/${Date.now()}.mp4`,
      videoBuffer,
      "video/mp4"
    );

    return url;
  } finally {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
  }
}

async function downloadFile(url: string, outputPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download ${url}`);
  const buffer = await response.arrayBuffer();
  fs.writeFileSync(outputPath, Buffer.from(buffer));
}
