import { Application, Text } from "pixi.js";
import { PipePair } from "./pipePair";
import { initAssets } from "./assets";
import { Background } from "./bg";
import { Bird } from "./bird";
import { state } from "./state";

export const app = new Application();
async function main() {
  await app.init({
    width: 800,
    height: 1200,
    canvas: document.getElementById("root") as HTMLCanvasElement,
    background: "#70c5ce",
  });
  const textures = await initAssets();

  // 读取历史最高分
  try {
    const saved = localStorage.getItem("flappy-fuzi-best");
    if (saved) state.best = parseInt(saved, 10) || 0;
  } catch {
    // localStorage 不可用时静默忽略
  }

  const bird = new Bird(textures.bird);
  const bg = new Background(textures.bg);
  const pipe = new PipePair(textures.tube);

  /** 分数显示文本 */
  const scoreText = new Text({
    text: "0",
    style: {
      fontSize: app.screen.width * 0.12,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: app.screen.width * 0.01 },
      fontWeight: "bold",
    },
  });
  scoreText.anchor.set(0.5, 0);
  scoreText.x = app.screen.width / 2;
  scoreText.y = app.screen.width * 0.05;

  /** 最高分显示文本 */
  const bestText = new Text({
    text: `BEST ${state.best}`,
    style: {
      fontSize: app.screen.width * 0.04,
      fill: 0xffffff,
      stroke: { color: 0x000000, width: app.screen.width * 0.005 },
      fontWeight: "bold",
    },
  });
  bestText.anchor.set(0.5, 0);
  bestText.x = app.screen.width / 2;
  bestText.y = app.screen.width * 0.2;

  app.stage.addChild(bg, pipe, bird, scoreText, bestText);

  app.ticker.add((ticker) => {
    pipe.update(ticker.deltaTime);
    bg.update(ticker.deltaTime);
    bird.update(ticker.deltaTime);

    // 跨越检测：管道中心从 bird 右侧穿到左侧时 +1 分
    if (!state.paused && !pipe.scored && pipe.x <= bird.x) {
      pipe.scored = true;
      state.score++;
      scoreText.text = String(state.score);
      // 随分数线性加速，不超过上限
      state.speed = Math.min(
        state.baseSpeed + state.score * state.speedPerScore,
        state.maxSpeed,
      );
    }

    const bounds = bird.getBounds();
    if (
      ((bird.isOnGround() || bird.y <= app.screen.top) && !bird.dead) ||
      pipe.top.getBounds().rectangle.intersects(bounds.rectangle) ||
      pipe.bottom.getBounds().rectangle.intersects(bounds.rectangle)
    ) {
      state.paused = true;
      bird.dead = true;
      // 死亡时刷新最高分
      if (state.score > state.best) {
        state.best = state.score;
        bestText.text = `BEST ${state.best}`;
        try {
          localStorage.setItem("flappy-fuzi-best", String(state.best));
        } catch {
          // localStorage 不可用时静默忽略
        }
      }
    }
  });

  const onclick = () => {
    if (state.paused) {
      if (bird.dead && bird.isOnGround()) {
        bird.reset();
        pipe.spawn();
        return;
      }
      if (!bird.dead) {
        bird.reset();
        pipe.spawn();
        state.score = 0;
        state.speed = state.baseSpeed;
        scoreText.text = "0";
        state.paused = false;
      }
    } else {
      jump(bird);
    }
  };

  app.canvas.onclick = (e) => {
    if (e.buttons == 0) {
      e.preventDefault();
      onclick();
    }
  };
  document.onkeydown = (e) => {
    if (e.key == " " || e.key == "ArrowUp") {
      e.preventDefault();
      onclick();
    }
  };
}

main();

function jump(bird: Bird) {
  if (state.paused) {
    return;
  }
  bird.v = -(app.screen.width / 400) * 5;
}
