import { TilingSprite, Texture } from "pixi.js";
import { app } from "./main";
import { state } from "./state";
export class Background extends TilingSprite {
  constructor(bg: Texture) {
    super(bg);
    this.x = 0;
    this.width = app.screen.width;
    this.height = app.screen.height;
    this.tileScale = app.screen.height / bg.height;
  }

  update(delta: number) {
    if (state.paused) {
      return;
    }
    this.tilePosition.x -= state.speed * delta;
  }
}
