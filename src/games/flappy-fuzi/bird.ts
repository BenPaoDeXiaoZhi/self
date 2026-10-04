import { Sprite, Texture } from "pixi.js";
import { app } from "./main";
import { state } from "./state";
export class Bird extends Sprite {
  v: number = 0;
  dead = false;
  constructor(bird: Texture) {
    super(bird);
    this.anchor = 0.5;
    this.scale = (app.screen.width / 400) * 0.12;
    this.x = (app.screen.width / 400) * 50;
    this.reset();
  }

  reset() {
    this.v = 0;
    this.y = app.screen.height / 2 + Math.sin(Date.now() / 500) * 20;
    this.dead = false;
  }

  update(delta: number) {
    const { paused } = state;
    if (paused && !this.dead) {
      this.rotation = 0;
      this.y = app.screen.height / 2 + Math.sin(Date.now() / 500) * 20;
    } else if (!paused && !this.dead) {
      this.rotation = 0;
      this.y += this.v * delta;
      this.v += (app.screen.width / 400) * 0.3 * delta;
    } else if (paused && this.dead) {
      this.rotation = Math.PI / 4;
      if (this.isOnGround()) {
        this.y = app.screen.bottom - 20;
        return;
      }
      this.y += this.v * delta;
      this.v += (app.screen.width / 400) * 0.5 * delta;
    }
  }

  isOnGround() {
    return this.y >= app.screen.bottom - 20;
  }
}
