/**
 * Tipos y utilidades para la generación y gestión de guiones de video
 */

export interface SceneData {
  sceneNumber: number;
  title: string;
  description: string;
  imagePrompt: string;
  subtitles: string;
  duration: number; // in seconds
}

export interface ScriptContent {
  title: string;
  description: string;
  scenes: SceneData[];
  totalDuration: number;
}

/**
 * Parsea la respuesta del LLM y extrae la estructura del guión
 */
export function parseScriptFromLLM(llmResponse: string): ScriptContent {
  try {
    // Intenta parsear como JSON primero
    const parsed = JSON.parse(llmResponse);
    return parsed as ScriptContent;
  } catch (e) {
    // Si no es JSON válido, intenta extraer la estructura del texto
    return extractScriptFromText(llmResponse);
  }
}

/**
 * Extrae la estructura del guión de texto plano
 */
function extractScriptFromText(text: string): ScriptContent {
  const lines = text.split('\n').filter(line => line.trim());
  const scenes: SceneData[] = [];
  let currentScene: Partial<SceneData> | null = null;
  let sceneNumber = 1;

  for (const line of lines) {
    if (line.match(/^(Escena|Scene)\s+\d+/i)) {
      if (currentScene && currentScene.title) {
        scenes.push({
          sceneNumber: currentScene.sceneNumber || sceneNumber,
          title: currentScene.title || `Scene ${sceneNumber}`,
          description: currentScene.description || '',
          imagePrompt: currentScene.imagePrompt || currentScene.description || '',
          subtitles: currentScene.subtitles || '',
          duration: currentScene.duration || 3,
        });
        sceneNumber++;
      }
      currentScene = {
        sceneNumber,
        title: line.replace(/^(Escena|Scene)\s+\d+[:\s]*/i, '').trim(),
      };
    } else if (line.match(/^(Descripción|Description):/i)) {
      if (currentScene) {
        currentScene.description = line.replace(/^(Descripción|Description):/i, '').trim();
        currentScene.imagePrompt = currentScene.description;
      }
    } else if (line.match(/^(Subtítulos|Subtitles):/i)) {
      if (currentScene) {
        currentScene.subtitles = line.replace(/^(Subtítulos|Subtitles):/i, '').trim();
      }
    } else if (line.match(/^(Duración|Duration):/i)) {
      if (currentScene) {
        const durationStr = line.replace(/^(Duración|Duration):/i, '').trim();
        const duration = parseInt(durationStr) || 3;
        currentScene.duration = duration;
      }
    }
  }

  // Agregar la última escena
  if (currentScene && currentScene.title) {
    scenes.push({
      sceneNumber: currentScene.sceneNumber || sceneNumber,
      title: currentScene.title || `Scene ${sceneNumber}`,
      description: currentScene.description || '',
      imagePrompt: currentScene.imagePrompt || currentScene.description || '',
      subtitles: currentScene.subtitles || '',
      duration: currentScene.duration || 3,
    });
  }

  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

  return {
    title: 'Generated Script',
    description: text.split('\n')[0] || 'Video Script',
    scenes,
    totalDuration,
  };
}

/**
 * Genera un prompt para el LLM para crear un guión estructurado
 */
export function generateScriptPrompt(topic: string, format: string): string {
  const formatInfo = getFormatInfo(format);
  
  return `Generate a professional video script for a ${format} video about: "${topic}"

Requirements:
- Create 3-5 scenes with clear structure
- Each scene should have: title, description, image prompt, subtitles, and duration (3-5 seconds)
- Keep descriptions concise and visual (suitable for AI image generation)
- Subtitles should be short and impactful
- Total video duration should be between 15-60 seconds
- Format as JSON with this structure:
{
  "title": "Video Title",
  "description": "Brief description",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "Scene Title",
      "description": "Visual description for image generation",
      "imagePrompt": "Detailed prompt for AI image generation",
      "subtitles": "Text to display on screen",
      "duration": 4
    }
  ],
  "totalDuration": 20
}

Video Format: ${format}
Aspect Ratio: ${formatInfo.aspectRatio}
Recommended Duration: ${formatInfo.recommendedDuration}s

Generate the script in JSON format only, no additional text.`;
}

interface FormatInfo {
  aspectRatio: string;
  recommendedDuration: number;
}

function getFormatInfo(format: string): FormatInfo {
  const formats: Record<string, FormatInfo> = {
    tiktok: { aspectRatio: '9:16', recommendedDuration: 30 },
    instagram_reels_9_16: { aspectRatio: '9:16', recommendedDuration: 30 },
    instagram_reels_1_1: { aspectRatio: '1:1', recommendedDuration: 30 },
    youtube_shorts: { aspectRatio: '9:16', recommendedDuration: 45 },
  };
  return formats[format] || { aspectRatio: '9:16', recommendedDuration: 30 };
}
