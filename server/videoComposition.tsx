import React from 'react';
import { Composition, Sequence, AbsoluteFill, Img } from 'remotion';

interface SceneData {
  sceneNumber: number;
  title: string;
  description: string;
  imageUrl: string;
  subtitles: string;
  duration: number;
}

interface VideoCompositionProps {
  scenes: SceneData[];
  template: 'corporate' | 'modern' | 'minimalist';
  width: number;
  height: number;
  fps: number;
}

const getTemplateStyles = (template: string) => {
  const templates: Record<string, any> = {
    corporate: {
      bgColor: '#0f0f1e',
      textColor: '#ffffff',
      accentColor: '#7c3aed',
      fontFamily: 'Inter',
    },
    modern: {
      bgColor: '#ffffff',
      textColor: '#0f0f1e',
      accentColor: '#7c3aed',
      fontFamily: 'Inter',
    },
    minimalist: {
      bgColor: '#ffffff',
      textColor: '#0f0f1e',
      accentColor: '#0f0f1e',
      fontFamily: 'Inter',
    },
  };
  return templates[template] || templates.modern;
};

export const VideoComposition: React.FC<VideoCompositionProps> = ({
  scenes,
  template,
  width,
  height,
  fps,
}) => {
  const styles = getTemplateStyles(template);
  let currentFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: styles.bgColor }}>
      {scenes.map((scene) => {
        const sceneStartFrame = currentFrame;
        const sceneDurationFrames = Math.round(scene.duration * fps);
        currentFrame += sceneDurationFrames;

        return (
          <Sequence
            key={scene.sceneNumber}
            from={sceneStartFrame}
            durationInFrames={sceneDurationFrames}
          >
            <AbsoluteFill>
              {/* Background Image */}
              <Img
                src={scene.imageUrl}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />

              {/* Overlay for text */}
              <AbsoluteFill
                style={{
                  background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  padding: '40px',
                }}
              >
                {/* Subtitles */}
                <div
                  style={{
                    fontSize: 48,
                    fontFamily: styles.fontFamily,
                    color: styles.textColor,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    maxWidth: '100%',
                    wordWrap: 'break-word',
                  }}
                >
                  {scene.subtitles}
                </div>
              </AbsoluteFill>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export const createVideoComposition = (
  scenes: SceneData[],
  template: 'corporate' | 'modern' | 'minimalist',
  width: number,
  height: number
) => {
  const fps = 30;
  const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);
  const durationInFrames = Math.round(totalDuration * fps);

  return {
    component: VideoComposition,
    props: { scenes, template, width, height, fps },
    durationInFrames,
    fps,
    width,
    height,
  };
};
