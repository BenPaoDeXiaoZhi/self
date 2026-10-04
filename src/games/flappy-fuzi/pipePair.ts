import { Container, Sprite, Texture } from "pixi.js";
import { config } from "./config";
import { app } from "./main";
import { state } from "./state";

export class PipePair extends Container {
  top: Sprite;
  bottom: Sprite;
  /** 当前管道对是否已计分（防止重复加分） */
  scored = false;
  constructor(tube: Texture) {
    super();
    this.bottom = new Sprite({
      texture: tube,
      scale: {
        y: (-app.screen.width / 400) * 1.2,
        x: -app.screen.width / 400,
      },
    });
    this.top = new Sprite({
      texture: tube,
      scale: {
        y: (app.screen.width / 400) * 1.2,
        x: -app.screen.width / 400,
      },
    });
    this.addChild(this.top, this.bottom);

    this.top.anchor.set(0.5, 1 - config.pipe.anchorScale);
    this.bottom.anchor.set(0.5, 1 - config.pipe.anchorScale);
    this.top.position.set(tube.width / 2, app.screen.height / 2);
    this.bottom.position.set(tube.width / 2, app.screen.height / 2);
    this.pivot.set(tube.width / 2, app.screen.height / 2);
    this.spawn();
  }

  update(delta: number) {
    if (!state.paused) {
      this.x -= state.speed * delta;
    }
    if (this.x <= -this.width) {
      this.spawn();
    }
  }

  spawn() {
    this.x = app.screen.right + this.width;
    this.y =
      app.screen.height / 2 +
      (-app.screen.width / 400) * (100 - Math.random() * 250);
    this.scored = false;
  }
}
