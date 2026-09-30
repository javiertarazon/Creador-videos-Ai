import {
  AbsoluteFill,
  Audio,
  Img,
  Sequence,
  Video,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type ShortVideoScene = {
  text: string;
  durationSeconds: number;
  image?: string;
  clip?: string;
};

export type ShortVideoProps = {
  title: string;
  scenes: ShortVideoScene[];
  voiceover?: string;
  theme: {
    background: string;
    foreground: string;
    accent: string;
  };
};

const Scene: React.FC<{
  scene: ShortVideoScene;
  sceneIndex: number;
  title: string;
  theme: ShortVideoProps["theme"];
}> = ({ scene, sceneIndex, title, theme }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entrance = spring({
    frame,
    fps,
    config: { damping: 20, stiffness: 90 },
  });
  const imageScale = interpolate(
    frame,
    [0, durationInFrames],
    [1.04, 1.12],
    { extrapolateRight: "clamp" },
  );
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{ backgroundColor: theme.background, color: theme.foreground }}
    >
      {scene.image ? (
        <Img
          src={staticFile(scene.image)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${imageScale})`,
          }}
        />
      ) : scene.clip ? (
        <Video
          src={staticFile(scene.clip)}
          muted
          loop
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : null}
      {scene.image && scene.clip ? (
        <Video
          src={staticFile(scene.clip)}
          muted
          loop
          style={{
            position: "absolute",
            width: 380,
            height: 520,
            right: 72,
            bottom: 430,
            objectFit: "cover",
            border: `3px solid ${theme.foreground}`,
            borderRadius: 24,
            boxShadow: "0 24px 80px rgba(0, 0, 0, .42)",
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          background:
            `linear-gradient(180deg, ${theme.background}55 0%, ${theme.background}00 35%, ${theme.background}ee 100%)`,
          padding: "118px 82px 142px",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 30,
            letterSpacing: 5,
            textTransform: "uppercase",
            opacity: 0.88,
          }}
        >
          {title}
        </div>
        <div
          style={{
            transform: `translateY(${(1 - entrance) * 46}px)`,
            opacity: entrance,
            maxWidth: 920,
          }}
        >
          <div
            style={{
              width: 66,
              height: 7,
              borderRadius: 6,
              backgroundColor: theme.accent,
              marginBottom: 32,
            }}
          />
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 72,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              textShadow: "0 5px 30px rgba(0, 0, 0, .35)",
            }}
          >
            {scene.text}
          </div>
          <div
            style={{
              marginTop: 38,
              height: 5,
              width: "100%",
              backgroundColor: `${theme.foreground}42`,
              borderRadius: 8,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                backgroundColor: theme.accent,
                borderRadius: 8,
              }}
            />
          </div>
          <div
            style={{
              marginTop: 20,
              fontFamily: "Arial, sans-serif",
              fontSize: 23,
              letterSpacing: 3,
              opacity: 0.8,
            }}
          >
            {String(sceneIndex + 1).padStart(2, "0")}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ShortVideo: React.FC<ShortVideoProps> = ({
  title,
  scenes,
  voiceover,
  theme,
}) => {
  let from = 0;
  const sequences = scenes.map((scene, index) => {
    const durationInFrames = Math.max(1, Math.round(scene.durationSeconds * 30));
    const sequence = (
      <Sequence
        key={`${index}-${from}`}
        from={from}
        durationInFrames={durationInFrames}
        premountFor={30}
      >
        <Scene scene={scene} sceneIndex={index} title={title} theme={theme} />
      </Sequence>
    );
    from += durationInFrames;
    return sequence;
  });

  return (
    <AbsoluteFill>
      {sequences}
      {voiceover ? <Audio src={staticFile(voiceover)} /> : null}
    </AbsoluteFill>
  );
};
