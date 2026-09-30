import { Composition } from "remotion";
import { ShortVideo, type ShortVideoProps } from "./ShortVideo";

const defaultProps: ShortVideoProps = {
  title: "Una idea para recordar",
  theme: {
    background: "#142523",
    foreground: "#fff8eb",
    accent: "#f1b751",
  },
  scenes: [
    {
      text: "Una idea clara merece una historia que se vea tan bien como suena.",
      durationSeconds: 5,
    },
  ],
};

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SocialShort"
    component={ShortVideo}
    defaultProps={defaultProps}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={150}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(
        1,
        props.scenes.reduce(
          (total, scene) =>
            total + Math.max(1, Math.round(scene.durationSeconds * 30)),
          0,
        ),
      ),
    })}
  />
);
