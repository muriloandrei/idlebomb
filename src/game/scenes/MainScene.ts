import Phaser from 'phaser';
import { MapManager, BlockType } from '../MapManager';
import { Hero } from '../entities/Hero';
import { useGameStore } from '../../store/useGameStore';

const TILE_SIZE = 48;

// Removemos o hardcode do FRAME_WIDTH e FRAME_HEIGHT para um auto-scaler dinâmico

export class MainScene extends Phaser.Scene {
  private mapManager!: MapManager;
  private heroes: Hero[] = [];
  private blockSprites: (Phaser.GameObjects.Rectangle | null)[][] = [];
  private offsetX!: number;
  private offsetY!: number;
  private levelText!: Phaser.GameObjects.Text;

  constructor() {
    super('MainScene');
  }

  preload() {
    // Carrega imagens soltas
    this.load.image('idle-front', '/assets/hero/idle-front.png');
    this.load.image('idle-back', '/assets/hero/idle-back.png');
    this.load.image('idle-left', '/assets/hero/idle-left.png');
    this.load.image('idle-right', '/assets/hero/idle-right.png');
    this.load.image('walk-down-1', '/assets/hero/sprite-1-2.png');
    this.load.image('walk-up-1', '/assets/hero/sprite-1-4.png');
    this.load.image('walk-left-1', '/assets/hero/sprite-1-6.png');
    this.load.image('walk-left-2', '/assets/hero/sprite-1-7.png');
    this.load.image('walk-right-1', '/assets/hero/sprite-1-8.png');
    this.load.image('walk-right-2', '/assets/hero/sprite-1-9.png');

    // Auto-scaler p/ as Bombas, Explosion e Map
    this.load.image('bomb_raw', '/assets/bomb_sprite.png');
    this.load.image('explosion_raw', '/assets/explosion_sprite.png');
    this.load.image('bg_map', '/assets/bg_map.png');
  }

  create() {

    // AUTO-SCALER - Bomba (3 frames em linha reta)
    const bombTexture = this.textures.get('bomb_raw');
    if (bombTexture && bombTexture.key !== '__MISSING') {
        const bombCanvas = bombTexture.getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet('bomb', bombCanvas, {
            frameWidth: Math.floor(bombCanvas.width / 3),
            frameHeight: bombCanvas.height // Usa 1 linha cheia
        });
    }

    // AUTO-SCALER - Explosao (Cruz 5x5)
    // O Centro é sempre a celula do meio (Coluna 2, Linha 2 de um index 0 a 4)
    const expTexture = this.textures.get('explosion_raw');
    if (expTexture && expTexture.key !== '__MISSING') {
        const expCanvas = expTexture.getSourceImage() as HTMLImageElement;
        this.textures.addSpriteSheet('explosion', expCanvas, {
            frameWidth: Math.floor(expCanvas.width / 5),
            frameHeight: Math.floor(expCanvas.height / 5)
        });
    }

    // Busca Nivel atual para não resetar persistência
    const startLevel = useGameStore.getState().currentLevel;
    this.mapManager = new MapManager(15, 11, startLevel);
    this.cameras.main.setBackgroundColor('#1e293b'); // Fundo externo escuro

    const { width, height } = this.scale;
    const gridWidth = this.mapManager.cols * TILE_SIZE;
    const gridHeight = this.mapManager.rows * TILE_SIZE;

    this.offsetX = (width - gridWidth) / 2;
    this.offsetY = (height - gridHeight) / 2;

    // A imagem do mapa enviada tem proporções baseadas em: 1 bloco de borda esquerda, 1 de topo, 1 inferior e ~2 direita.
    // Totalizando 18 colunas (1+15+2) e 13 linhas (1+11+1).
    this.add.image(this.offsetX - TILE_SIZE, this.offsetY - TILE_SIZE, 'bg_map')
      .setOrigin(0, 0)
      .setDisplaySize(18 * TILE_SIZE, 13 * TILE_SIZE);

    // Texto flutuante com Level Atual (colocado no canto direito inferior fora do board)
    this.levelText = this.add.text(width - 250, height - 40, `META LEVEL: ${startLevel}`, {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#a3e635',
        fontStyle: 'bold'
    }).setShadow(2, 2, '#000000', 4, true, true);

    this.drawMapBlocks();
    this.createAnimations(); // Chama as animações auxiliares que ainda restaram (Bomb, Expo, etc)

    this.events.on('block-broken', (x: number, y: number) => {
      const rect = this.blockSprites[y][x];
      if(rect) {
          rect.setFillStyle(0x000000, 0); 
          rect.setStrokeStyle(1, 0x000000, 0.1); 
      }
      
      useGameStore.getState().incrementBoxes();
      
      // CHECAGEM DE PROGRESSÃO DE CENÁRIO (FASE 6)
      if (this.mapManager.getRemainingDestructibles() === 0) {
         this.time.delayedCall(150, () => {
             console.log("MAPA VENCIDO! PREPARANDO NOVO TERRENO...");
             useGameStore.getState().nextLevel(); 
             this.rebuildNextMap();
         });
      }
    });

    this.events.on('block-damaged', (x: number, y: number) => {
        const hp = this.mapManager.getHp(x, y);
        const rect = this.blockSprites[y][x];
        if (rect) {
            // Clareamento agressivo pra denotar "Rachadura" visual
            const baseColor = hp > 3 ? 0x450a0a : (hp === 3 ? 0x78350f : (hp === 2 ? 0x92400e : 0xb45309));
            rect.setFillStyle(baseColor);
        }
    });

    this.updateLocals();
    
    let lastSpeed = 1;
    let lastPaused = false;

    const unsub = useGameStore.subscribe(() => {
       const state = useGameStore.getState();
       
       if (state.gameSpeed !== lastSpeed || state.isPaused !== lastPaused) {
           lastSpeed = state.gameSpeed;
           lastPaused = state.isPaused;
           const timeScale = state.isPaused ? 0 : state.gameSpeed;
           
           this.time.timeScale = timeScale;
           this.tweens.timeScale = timeScale;
           this.anims.globalTimeScale = timeScale;
       }

       this.updateLocals(); 
    });
    
    this.events.on('destroy', () => {
        unsub();
    });
  }

  private updateLocals() {
    try {
      if (this.heroes) {
        // Checa se nasceram heróis novos na store
        const state = useGameStore.getState();
        const stateHeroes = state.heroes;
        
        for (let i = this.heroes.length; i < stateHeroes.length; i++) {
          const hData = stateHeroes[i];
          
          // Mapeamento não será mais utilizado baseado em Skin 
          // (todas terão as mesmas sprites individuais até adicionarmos mais variantes)

          const newHero = new Hero(this, {
            mapManager: this.mapManager,
            tileSize: TILE_SIZE,
            offsetX: this.offsetX,
            offsetY: this.offsetY,
            startX: 1, 
            startY: 1
          });
          const speedLvl = state.upgradeSpeedLevel || 1;
          const cdLvl = state.upgradeCooldownLevel || 1;

          newHero.speed = hData.speed + (speedLvl * 0.2); // Fica mais rapido
          newHero.power = hData.power;
          newHero.maxStamina = hData.maxStamina;
          newHero.stamina = hData.maxStamina;
          newHero.bombCooldown = Math.max(500, 3500 - (cdLvl * 200));
          
          // Para evitar o efeito de que não apareceu por estar na mesma exata posição pixel por pixel:
          // Se não for o primeiro, aplicamos um mini offset visual até ele andar
          if (i > 0) {
              newHero.x += (Math.random() * 10 - 5);
              newHero.y += (Math.random() * 10 - 5);
          }
          
          this.heroes.push(newHero);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  private createAnimations() {
    // Criando animações manuais com as imagens individuais separadas
    this.anims.create({
      key: 'walk_down',
      frames: [ { key: 'walk-down-1' }, { key: 'idle-front' } ],
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'walk_up',
      frames: [ { key: 'walk-up-1' }, { key: 'idle-back' } ],
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'walk_left',
      frames: [ { key: 'walk-left-1' }, { key: 'walk-left-2' } ],
      frameRate: 4,
      repeat: -1
    });

    this.anims.create({
      key: 'walk_right',
      frames: [ { key: 'walk-right-1' }, { key: 'walk-right-2' } ],
      frameRate: 4,
      repeat: -1
    });

    // Animação da Bomba Pulsando
    if (this.textures.exists('bomb')) {
      try {
        this.anims.create({
          key: 'bomb_tick',
          frames: this.anims.generateFrameNumbers('bomb', { start: 0, end: 2 }),
          frameRate: 6,
          repeat: -1,
          yoyo: true // Faz inflar e desinflar suavemente!
        });
      } catch (e) { console.warn("Erro gerando anim бомба"); }
    }
    
    // Animações Estáticas da Explosão (Grid 5x5)
    if (this.textures.exists('explosion')) {
      try {
        const expAnims = [
           { key: 'exp_top_end', frame: 2 },
           { key: 'exp_vert_body', frame: 7 },
           { key: 'exp_left_end', frame: 10 },
           { key: 'exp_horz_body', frame: 11 },
           { key: 'exp_center', frame: 12 },
           { key: 'exp_right_end', frame: 14 },
           { key: 'exp_bot_end', frame: 22 }
        ];
        expAnims.forEach(anim => {
            this.anims.create({
               key: anim.key,
               frames: [ { key: 'explosion', frame: anim.frame } ],
               frameRate: 1
            });
        });
      } catch (e) { console.warn("Erro gerando anim explsoao"); }
    }
  }

  private drawMapBlocks() {
    const level = useGameStore.getState().currentLevel;
    
    // Atualiza apenas o texto de Level (Sem mexer mais na cor do Floor porque a Imagem provê tudo)
    this.levelText.setText(`TERRENO LV: ${level}`).setColor(`#a3e635`);

    for (let y = 0; y < this.mapManager.rows; y++) {
      if(!this.blockSprites[y]) this.blockSprites[y] = [];
      
      for (let x = 0; x < this.mapManager.cols; x++) {
        const block = this.mapManager.getBlock(x, y);
        const screenX = this.offsetX + x * TILE_SIZE;
        const screenY = this.offsetY + y * TILE_SIZE;

        if (this.blockSprites[y][x]) {
            this.blockSprites[y][x]?.destroy();
        }
        
        let rect: Phaser.GameObjects.Rectangle | null = null;
        if (block === BlockType.DESTRUCTIBLE) {
          rect = this.add.rectangle(screenX, screenY, TILE_SIZE, TILE_SIZE, 0x450a0a).setOrigin(0, 0);
          rect.setStrokeStyle(2, 0x27272a);
        }
        // As paredes "imquebráveis" e o fundo vazio (BlockType.WALL e BlockType.EMPTY) não precisam ser desenhados.
        // O cenário inteiro (incluindo as pedras fixas) já está pintado na imagem de background `bg_map.png`.
        
        this.blockSprites[y][x] = rect;
      }
    }
  }

  private rebuildNextMap() {
      const newLevel = useGameStore.getState().currentLevel;
      this.mapManager.generateMap(newLevel);
      this.drawMapBlocks();

      this.heroes.forEach((h, index) => {
          this.tweens.killTweensOf(h);
          h.gridX = 1;
          h.gridY = 1;
          h.x = this.offsetX + 1 * TILE_SIZE + TILE_SIZE / 2;
          h.y = this.offsetY + 1 * TILE_SIZE + TILE_SIZE / 2;
          
          if (index > 0) {
              h.x += (Math.random() * 10 - 5);
              h.y += (Math.random() * 10 - 5);
          }
          
          h.heroState = 'IDLE' as any;
          h.stamina = h.maxStamina; // Bonificação ao limpar a fase
          
          if((h as any).actionTimer) {
             (h as any).actionTimer.remove();
             (h as any).actionTimer = null;
          }
      });
  }

  update(time: number, delta: number) {
    const state = useGameStore.getState();
    if (state.isPaused) return;
    
    const effectiveDelta = delta * state.gameSpeed;
    this.heroes.forEach(h => h.updateLogic(time, effectiveDelta));
  }
}
