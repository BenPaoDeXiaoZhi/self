import { Assets, Texture } from "pixi.js";

export async function initAssets() {
  await Assets.init({
    basePath: "/assets/game",
  });
  const textures = await Assets.load<Texture>([
    {
      alias: "bird",
      src: "bird.png",
    },
    {
      alias: "tube",
      src: "tube.png",
    },
    {
      alias: "bg",
      src: "bg.png",
    },
  ]);
  return textures;
}
