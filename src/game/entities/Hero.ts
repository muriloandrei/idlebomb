import Phaser from 'phaser';
import { MapManager, BlockType } from '../MapManager';
import { Bomb } from './Bomb';

export const HeroState = {
  IDLE: 'IDLE',
  WANDER: 'WANDER',
  PLANT_BOMB: 'PLANT_BOMB',
  SLEEP: 'SLEEP'
} as const;

export type HeroState = typeof HeroState[keyof typeof HeroState];

type Direction = "up" | "down" | "left" | "right";

export interface HeroConfig {
  mapManager: MapManager;
  tileSize: number;
  offsetX: number;
  offsetY: number;
  startX: number;
  startY: number;
}

const DIRECTIONS: Direction[] = ["up", "down", "left", "right"];
const DELTA: Record<Direction, { dr: number; dc: number }> = {
  up:    { dr: -1, dc:  0 },
  down:  { dr:  1, dc:  0 },
  left:  { dr:  0, dc: -1 },
  right: { dr:  0, dc:  1 },
};

export class Hero extends Phaser.GameObjects.Sprite {
  public gridX: number;
  public gridY: number;
  public heroState: HeroState = HeroState.IDLE;

  public speed: number = 2; // Reduzido base speed para andarem de forma mais suave
  public power: number = 1;
  public stamina: number = 15;
  public maxStamina: number = 15;
  public bombCooldown: number = 3500;
  
  private isBombReady: boolean = true;

  private config: HeroConfig;
  private stateTimer: number = 0;
  private currentDir: Direction = "down";
  private moveTween: Phaser.Tweens.Tween | null = null;
  private lastGridX: number = -1;
  private lastGridY: number = -1;

  constructor(scene: Phaser.Scene, config: HeroConfig) {
    const { tileSize, offsetX, offsetY, startX, startY } = config;
    const pixelX = offsetX + startX * tileSize + tileSize / 2;
    const pixelY = offsetY + startY * tileSize + tileSize / 2;

    super(scene, pixelX, pixelY, 'idle-front');
    this.config = config;
    this.gridX = startX;
    this.gridY = startY;

    // Escalonamento fixo de 90% para cobrir a célula 
    // Independente das dimensões físicas da imagem avulsa
    this.setDisplaySize(tileSize * 0.9, tileSize * 0.9);
    
    scene.add.existing(this);

    this.setIdle();
    this.transitionTo(HeroState.IDLE, 500 + Math.random() * 1000);
  }

  public updateLogic(_time: number, delta: number) {
    if (this.heroState === HeroState.SLEEP) {
      this.handleSleep(delta);
      return;
    }

    if (this.heroState === HeroState.IDLE) {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) {
        this.decide();
      }
    }
  }

  private decide(): void {
    if (this.stamina <= 0) {
      this.transitionTo(HeroState.SLEEP, 0);
      return;
    }

    const bombTarget = this.findAdjacentDestructible();
    if (bombTarget && this.isBombReady) {
      this.transitionTo(HeroState.PLANT_BOMB, 0);
      this.executePlantBomb();
      return;
    }

    // Vagar aleatoriamente
    this.transitionTo(HeroState.WANDER, 0);
    this.executeWander();
  }

  private executeWander(): void {
    const { mapManager } = this.config;
    
    // Evita voltar imediatamente, exceto se for beco sem saída
    let possibleDirs = DIRECTIONS.filter(dir => {
      const { dr, dc } = DELTA[dir];
      const nr = this.gridY + dr;
      const nc = this.gridX + dc;
      return mapManager.getBlock(nc, nr) === BlockType.EMPTY;
    });

    if (possibleDirs.length > 0) {
      // Tenta não voltar para a última célula
      const optionsWithoutBacktracking = possibleDirs.filter(dir => {
         const { dr, dc } = DELTA[dir];
         return (this.gridY + dr !== this.lastGridY) || (this.gridX + dc !== this.lastGridX);
      });
      
      const dirsToUse = optionsWithoutBacktracking.length > 0 ? optionsWithoutBacktracking : possibleDirs;
      
      const dir = dirsToUse[Math.floor(Math.random() * dirsToUse.length)];
      
      const { dr, dc } = DELTA[dir];
      this.moveToCell(this.gridX + dc, this.gridY + dr, dir);
      this.drainStamina(1);
    } else {
      // Sem movimento possível — aguarda
      this.transitionTo(HeroState.IDLE, 400);
    }
  }

  private executePlantBomb(): void {
    this.setIdle();
    this.drainStamina(5);

    this.isBombReady = false;
    this.scene.time.delayedCall(this.bombCooldown, () => {
       this.isBombReady = true;
    });

      const currentBombX = this.gridX;
      const currentBombY = this.gridY;
      
      this.scene.time.delayedCall(400, () => {
        if (!this.active) return;
        
        const { mapManager, offsetX, offsetY, tileSize } = this.config;
        new Bomb(this.scene, {
          mapManager,
          offsetX,
          offsetY,
          tileSize,
          gridX: currentBombX,
          gridY: currentBombY, 
          power: this.power
        });

        // Transita ele imediatamente de PLANT_BOMB pra WANDER
        // A Inteligência de Fuga calcula a próxima célula agora mesmo que a bomba apareceu
        // Visualmente simulando o herói "tancando" a pose parado e então correndo
        this.lastGridX = -1; 
        this.executeWander();
      });
  }

  private handleSleep(delta: number): void {
    this.setIdle();

    // Recupera stamina
    const regenRate = 20; // pts/sec
    this.stamina += (regenRate * delta) / 1000;
    this.stamina = Math.min(this.stamina, this.maxStamina);

    this.setAlpha(Math.sin(Date.now() / 200) * 0.25 + 0.75);

    if (this.stamina >= this.maxStamina) {
      this.setAlpha(1);
      this.setIdle();
      this.transitionTo(HeroState.IDLE, 200);
      console.log("Herói Acordou!");
    }
  }

  private moveToCell(x: number, y: number, dir: Direction): void {
    this.lastGridX = this.gridX;
    this.lastGridY = this.gridY;
    
    this.gridX = x;
    this.gridY = y;

    this.currentDir = dir;

    this.updateDirectionAnim(dir);

    const { offsetX, offsetY, tileSize } = this.config;
    const targetPixelX = offsetX + x * tileSize + tileSize / 2;
    const targetPixelY = offsetY + y * tileSize + tileSize / 2;

    // Ajustado para 1500 / speed para dar tempo das pernas dos novos sprites completarem a animação bonita
    const durationObj = 1500 / this.speed;

    this.moveTween?.stop();
    this.moveTween = this.scene.tweens.add({
      targets: this,
      x: targetPixelX,
      y: targetPixelY,
      duration: durationObj,
      ease: "Linear",
      onComplete: () => {
        this.setIdle(); // Fica idle na última direção virada
        this.transitionTo(HeroState.IDLE, 50); // Pause pequeno entre passos
      },
    });

    this.setFlipX(dir === "left");
  }

  private playAnim(key: string): void {
    if (this.anims.currentAnim?.key !== key) {
        try {
            if (this.scene.anims.exists(key)) {
                this.play(key, true);
            }
        } catch (e) {
            console.warn("Anim missing:", key);
        }
    }
  }

  private setIdle(): void {
    this.stop(); // Stop any running animation
    switch (this.currentDir) {
      case "up":    this.setTexture("idle-back");   break;
      case "down":  this.setTexture("idle-front");  break;
      case "left":  this.setTexture("idle-left");   break;
      case "right": this.setTexture("idle-right");  break;
      default:      this.setTexture("idle-front");  break;
    }
  }

  private updateDirectionAnim(dir: Direction): void {
    switch (dir) {
      case "up":    this.playAnim("walk_up");   break;
      case "down":  this.playAnim("walk_down"); break;
      case "left":  this.playAnim("walk_left"); break;
      case "right": this.playAnim("walk_right"); break;
    }
  }

  private transitionTo(state: HeroState, timerMs: number): void {
    this.heroState = state;
    this.stateTimer = timerMs;
  }

  private findAdjacentDestructible(): { x: number; y: number } | null {
    const { mapManager } = this.config;
    for (const dir of DIRECTIONS) {
      const { dr, dc } = DELTA[dir];
      const nr = this.gridY + dr;
      const nc = this.gridX + dc;
      if (mapManager.getBlock(nc, nr) === BlockType.DESTRUCTIBLE) {
        return { x: nc, y: nr };
      }
    }
    return null;
  }

  private drainStamina(amount: number): void {
    this.stamina = Math.max(0, this.stamina - amount);
  }
}
