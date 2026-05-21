import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import { storagePut } from "./storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

/**
 * Genera narración de voz para un texto usando OpenAI TTS
 */
export async function generateNarration(
  text: string,
  voice: TTSVoice = "nova",
  speed: number = 1.0
): Promise<string> {
  try {
    const tempDir = `/tmp/tts-${Date.now()}`;
    fs.mkdirSync(tempDir, { recursive: true });

    const audioPath = path.join(tempDir, "narration.mp3");

    // Generar audio con OpenAI TTS
    const mp3 = await openai.audio.speech.create({
      model: "tts-1-hd",
      voice: voice,
      input: text,
      speed: speed,
    });

    // Guardar archivo temporal
    const buffer = Buffer.from(await mp3.arrayBuffer());
    fs.writeFileSync(audioPath, buffer);

    // Subir a S3
    const { url } = await storagePut(
      `narrations/${Date.now()}-${voice}.mp3`,
      buffer,
      "audio/mpeg"
    );

    // Limpiar temporal
    fs.rmSync(tempDir, { recursive: true });

    return url;
  } catch (error) {
    console.error("[TTS] Error generando narración:", error);
    throw error;
  }
}

/**
 * Genera narración para múltiples escenas
 */
export async function generateNarrationsForScenes(
  scenes: Array<{ subtitle: string; duration: number }>,
  voice: TTSVoice = "nova"
): Promise<Array<{ url: string; duration: number }>> {
  const narrations: Array<{ url: string; duration: number }> = [];

  for (const scene of scenes) {
    try {
      const url = await generateNarration(scene.subtitle, voice);
      narrations.push({ url, duration: scene.duration });
    } catch (error) {
      console.error("[TTS] Error en escena:", error);
      // Continuar con la siguiente escena
    }
  }

  return narrations;
}

/**
 * Obtiene voces disponibles y sus características
 */
export function getAvailableVoices(): Array<{
  id: TTSVoice;
  name: string;
  description: string;
}> {
  return [
    {
      id: "alloy",
      name: "Alloy",
      description: "Voz neutra y profesional, tono medio",
    },
    {
      id: "echo",
      name: "Echo",
      description: "Voz cálida y amigable",
    },
    {
      id: "fable",
      name: "Fable",
      description: "Voz narrativa y expresiva",
    },
    {
      id: "onyx",
      name: "Onyx",
      description: "Voz profunda y resonante",
    },
    {
      id: "nova",
      name: "Nova",
      description: "Voz clara y moderna (recomendada)",
    },
    {
      id: "shimmer",
      name: "Shimmer",
      description: "Voz brillante y energética",
    },
  ];
}
