import Phaser from 'phaser';
import { MapManager, BlockType } from '../MapManager';
import { useGameStore } from '../../store/useGameStore';

export interface BombConfig {
  mapManager: MapManager;
  tileSize: number;
  offsetX: number;
  offsetY: number;
  gridX: number;
  gridY: number;
  power: number; // Range da explosão (ex: 1 = +1 cruz em cada lado)
}

export class Bomb extends Phaser.GameObjects.Container {
  private config: BombConfig;
  private visual: Phaser.GameObjects.Sprite;

  constructor(scene: Phaser.Scene, config: BombConfig) {
    const { tileSize, offsetX, offsetY, gridX, gridY } = config;
    const pixelX = offsetX + gridX * tileSize + tileSize / 2;
    const pixelY = offsetY + gridY * tileSize + tileSize / 2;

    super(scene, pixelX, pixelY);
    this.config = config;

    // Visual da Bomba: Sprite Animado
    this.visual = scene.add.sprite(0, 0, 'bomb');
    
    // Trava matemática de tamanho: Força a bomba a ter 80% do tamanho do Bloco, ignorando a resolução original
    this.visual.setDisplaySize(tileSize * 0.8, tileSize * 0.8);
    
    try {
        if (scene.anims.exists('bomb_tick')) {
            this.visual.play('bomb_tick');
        }
    } catch (e) {}

    this.add(this.visual);
    scene.add.existing(this);

    // Explode após 1.5s
    scene.time.delayedCall(1500, () => {
        this.explode();
    });
  }

  private explode() {
    const { mapManager, gridX, gridY, power } = this.config;

    // Vetores de Raycast com Nomes para Puxar Animação Correta
    const directions = [
      { name: 'up', x: 0, y: -1 }, 
      { name: 'down', x: 0, y: 1 },  
      { name: 'left', x: -1, y: 0 }, 
      { name: 'right', x: 1, y: 0 }   
    ];

    // Renderiza o fogo no próprio centro da bomba
    this.renderExplosion(gridX, gridY, 'exp_center');

    for (const dir of directions) {
      for (let i = 1; i <= power; i++) {
        const targetX = gridX + dir.x * i;
        const targetY = gridY + dir.y * i;

        const block = mapManager.getBlock(targetX, targetY);

        if (block === BlockType.WALL) {
          // A parede trava totalmente a explosão nesta direção
          break;
        }

        // Se for o último raio do alcance (power) OU se colidiu com uma caixa destrutível: Renderizar a Ponta
        const isEnd = (i === power) || (block === BlockType.DESTRUCTIBLE);

        let animKey = '';
        if (dir.name === 'up') animKey = isEnd ? 'exp_top_end' : 'exp_vert_body';
        else if (dir.name === 'down') animKey = isEnd ? 'exp_bot_end' : 'exp_vert_body';
        else if (dir.name === 'left') animKey = isEnd ? 'exp_left_end' : 'exp_horz_body';
        else if (dir.name === 'right') animKey = isEnd ? 'exp_right_end' : 'exp_horz_body';

        this.renderExplosion(targetX, targetY, animKey);

        if (block === BlockType.DESTRUCTIBLE) {
          // A caixa toma dano na proporção do 'power' do Herói
          const destroyed = mapManager.breakBlock(targetX, targetY, power);
          
          if (destroyed) {
              const currentLevel = useGameStore.getState().currentLevel;
              // Ganho escala com o level atual (Map 1 = 10, Map 5 = 50)
              window.dispatchEvent(new CustomEvent('gold-earned', { detail: { value: 10 * currentLevel } }));
              
              // Alerta visual a Scene Phaser para limpar a caixa
              this.scene.events.emit('block-broken', targetX, targetY);
          } else {
              // Caixa só tomou dano superficial
              this.scene.events.emit('block-damaged', targetX, targetY);
          }

          // No padrão Bomber, o fogo NÃO fura/atravessa o 1º bloco atingido. Para aqui.
          break;
        }
      }
    }

    // Bomba destruída da Engine
    this.destroy();
  }

  private renderExplosion(x: number, y: number, animKey: string) {
    const { tileSize, offsetX, offsetY } = this.config;
    const px = offsetX + x * tileSize + tileSize / 2;
    const py = offsetY + y * tileSize + tileSize / 2;

    const flash = this.scene.add.sprite(px, py, 'explosion');
    
    // Força o fogo a ocupar 110% do Bloco (escapando um pouquinho para grudar um fogo no outro)
    flash.setDisplaySize(tileSize * 1.1, tileSize * 1.1);

    try {
        if (this.scene.anims.exists(animKey)) {
            flash.play(animKey);
        }
    } catch (e) { }
    
    // Animação da Explosão dissipando
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 350,
      onComplete: () => flash.destroy()
    });
  }
}
