import Phaser from "phaser";
import { mulberry32, type Rng } from "@/lib/utils/rng";
import { GAME } from "../engine/config";
import { environmentAt, type EnvironmentTheme, type RoofStyle } from "./environments";

const BAND_HEIGHTS = [300, 240, 180] as const;
/** Parallax factor per band (fraction of world speed). */
const BAND_PARALLAX = [0.08, 0.2, 0.42] as const;
const TEX_WIDTH = 960;

/**
 * Paints and scrolls the district skylines. Each theme renders three
 * seeded silhouette bands into generated textures; theme changes crossfade
 * the whole set over ~1.2 s. Architecture varies by RoofStyle so every
 * district is recognisable at a glance.
 */
export class CityPainter {
  private sky: Phaser.GameObjects.Rectangle;
  private skyGradient: Phaser.GameObjects.Graphics;
  private bands: Phaser.GameObjects.TileSprite[] = [];
  private fadeBands: Phaser.GameObjects.TileSprite[] = [];
  private ground: Phaser.GameObjects.Rectangle;
  private groundLine: Phaser.GameObjects.Rectangle;
  private themeIndex = -1;
  private generation = 0;

  constructor(private scene: Phaser.Scene) {
    const { WIDTH, HEIGHT, GROUND_Y } = GAME;
    this.sky = scene.add
      .rectangle(0, 0, WIDTH, HEIGHT, 0x0b0e17)
      .setOrigin(0)
      .setDepth(0);
    this.skyGradient = scene.add.graphics().setDepth(1);

    for (let i = 0; i < 3; i++) {
      const y = GROUND_Y;
      const fade = scene.add
        .tileSprite(0, y, WIDTH, BAND_HEIGHTS[i]!, "__WHITE")
        .setOrigin(0, 1)
        .setDepth(2 + i)
        .setAlpha(0);
      const band = scene.add
        .tileSprite(0, y, WIDTH, BAND_HEIGHTS[i]!, "__WHITE")
        .setOrigin(0, 1)
        .setDepth(2 + i)
        .setAlpha(0);
      this.fadeBands.push(fade);
      this.bands.push(band);
    }

    this.ground = scene.add
      .rectangle(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y, 0x070910)
      .setOrigin(0)
      .setDepth(6);
    this.groundLine = scene.add
      .rectangle(0, GROUND_Y, WIDTH, 3, 0x2c3554)
      .setOrigin(0, 0)
      .setDepth(7);

    this.setTheme(0, true);
  }

  /** Called every frame with the player's world x. */
  update(worldX: number): void {
    for (let i = 0; i < 3; i++) {
      const offset = worldX * BAND_PARALLAX[i]!;
      this.bands[i]!.tilePositionX = offset;
      this.fadeBands[i]!.tilePositionX = offset;
    }
  }

  setTheme(index: number, instant = false): void {
    if (index === this.themeIndex) return;
    this.themeIndex = index;
    this.generation += 1;
    const gen = this.generation;
    const theme = environmentAt(index);

    // Repaint sky gradient.
    this.skyGradient.clear();
    this.paintSky(theme);

    for (let i = 0; i < 3; i++) {
      const key = `city-${gen}-${i}`;
      this.paintBandTexture(key, theme, i);
      const oldTexture = this.bands[i]!.texture.key;

      if (instant) {
        this.bands[i]!.setTexture(key).setAlpha(1);
      } else {
        // Move current image to the fade layer, bring the new one in.
        this.fadeBands[i]!.setTexture(oldTexture).setAlpha(1);
        this.bands[i]!.setTexture(key).setAlpha(0);
        this.scene.tweens.add({
          targets: this.bands[i],
          alpha: 1,
          duration: 1200,
          ease: "Sine.easeInOut",
        });
        this.scene.tweens.add({
          targets: this.fadeBands[i],
          alpha: 0,
          duration: 1200,
          ease: "Sine.easeInOut",
          onComplete: () => {
            if (oldTexture.startsWith("city-")) {
              this.scene.textures.remove(oldTexture);
            }
          },
        });
      }
    }

    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: instant ? 0 : 1200,
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 1;
        const ground = Phaser.Display.Color.Interpolate.ColorWithColor(
          Phaser.Display.Color.IntegerToColor(this.ground.fillColor),
          Phaser.Display.Color.IntegerToColor(theme.groundColor),
          1,
          t,
        );
        this.ground.setFillStyle(
          Phaser.Display.Color.GetColor(ground.r, ground.g, ground.b),
        );
      },
      onComplete: () => {
        this.ground.setFillStyle(theme.groundColor);
        this.groundLine.setFillStyle(theme.groundLine);
      },
    });
  }

  private paintSky(theme: EnvironmentTheme): void {
    const { WIDTH, HEIGHT } = GAME;
    this.sky.setFillStyle(theme.skyTop);
    const steps = 24;
    const top = Phaser.Display.Color.IntegerToColor(theme.skyTop);
    const bottom = Phaser.Display.Color.IntegerToColor(theme.skyBottom);
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(
        top,
        bottom,
        1,
        t,
      );
      this.skyGradient.fillStyle(
        Phaser.Display.Color.GetColor(c.r, c.g, c.b),
        1,
      );
      const y = (HEIGHT / steps) * i;
      this.skyGradient.fillRect(0, y, WIDTH, HEIGHT / steps + 1);
    }
  }

  private paintBandTexture(
    key: string,
    theme: EnvironmentTheme,
    bandIndex: number,
  ): void {
    const height = BAND_HEIGHTS[bandIndex]!;
    const rng = mulberry32(0xc17 + this.themeIndex * 97 + bandIndex);
    const g = this.scene.add.graphics();
    const color = theme.bands[bandIndex]!;

    let x = 0;
    while (x < TEX_WIDTH) {
      const w = 30 + rng() * (bandIndex === 2 ? 90 : 60);
      const maxH = height * (0.45 + 0.5 * rng());
      const h = Math.max(26, maxH);
      const baseY = height - h;
      g.fillStyle(color, 1);
      this.paintBuilding(g, theme.roof, x, baseY, w, h, height, rng);

      // Sparse warm windows on the nearest band only.
      if (bandIndex === 2) {
        g.fillStyle(theme.accent, 0.20);
        const count = Math.floor((w * h) / 2200);
        for (let i = 0; i < count; i++) {
          g.fillRect(
            x + 4 + rng() * (w - 8),
            baseY + 10 + rng() * (h - 18),
            2.5,
            4,
          );
        }
      }
      x += w + 4 + rng() * 22;
    }

    g.generateTexture(key, TEX_WIDTH, height);
    g.destroy();
  }

  private paintBuilding(
    g: Phaser.GameObjects.Graphics,
    roof: RoofStyle,
    x: number,
    y: number,
    w: number,
    h: number,
    bandH: number,
    rng: Rng,
  ): void {
    switch (roof) {
      case "spire": {
        const bodyW = w * 0.72;
        const bx = x + (w - bodyW) / 2;
        g.fillRect(bx, y + 14, bodyW, h - 14);
        g.fillTriangle(bx, y + 14, bx + bodyW, y + 14, bx + bodyW / 2, y - 8);
        g.fillRect(bx + bodyW / 2 - 1, y - 22, 2, 16);
        break;
      }
      case "block": {
        g.fillRect(x, y, w, h);
        if (rng() > 0.5) g.fillRect(x + w * 0.2, y - 10, w * 0.6, 10);
        break;
      }
      case "slant": {
        const dir = rng() > 0.5 ? 1 : -1;
        const drop = 10 + rng() * 18;
        g.fillRect(x, y + drop, w, h - drop);
        if (dir > 0) g.fillTriangle(x, y + drop, x + w, y + drop, x + w, y);
        else g.fillTriangle(x, y + drop, x + w, y + drop, x, y);
        break;
      }
      case "arch": {
        g.fillRect(x, y + w * 0.25, w, h - w * 0.25);
        g.fillEllipse(x + w / 2, y + w * 0.28, w, w * 0.55);
        break;
      }
      case "step": {
        const steps = 2 + Math.floor(rng() * 2);
        for (let i = 0; i < steps; i++) {
          const inset = (w * 0.16 * i) / 1;
          const sy = y + (h * 0.22 * i) / 1;
          g.fillRect(x + inset, sy, w - inset * 2, h - (sy - y));
        }
        break;
      }
      case "rail": {
        // Low-rise blocks with an elevated metro line running across.
        g.fillRect(x, y + h * 0.4, w, h * 0.6);
        const railY = bandH * 0.52;
        g.fillRect(x - 4, railY, w + 8, 5);
        g.fillRect(x + w * 0.3, railY, 6, bandH - railY);
        break;
      }
    }
  }
}
