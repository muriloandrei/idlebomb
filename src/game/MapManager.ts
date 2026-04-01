export const BlockType = {
  EMPTY: 0,
  WALL: 1, // Cinza - Indestrutível
  DESTRUCTIBLE: 2 // Vermelho - Destrutível (Caixa)
} as const;

export type BlockType = typeof BlockType[keyof typeof BlockType];

// Verde = 0, Cinza = 1. A cor Vermelha (2) será sorteada em cima dos Verdes (0).
const BASE_LAYOUT = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

export class MapManager {
  public cols: number;
  public rows: number;
  public grid: number[][]; 
  public hpGrid: number[][];

  constructor(_cols: number = 15, _rows: number = 11, level: number = 1) {
    this.cols = BASE_LAYOUT[0].length;
    this.rows = BASE_LAYOUT.length;
    this.grid = [];
    this.hpGrid = [];
    this.generateMap(level);
  }

  public generateMap(level: number) {
    this.grid = [];
    this.hpGrid = [];
    
    // Lista para guardar todas as coordenadas "verdes" disponíveis
    const availableGreens: {x: number, y: number}[] = [];

    // Copiar layout base e coletar blocos andáveis
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      this.hpGrid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        const type = BASE_LAYOUT[y][x];
        this.grid[y][x] = type;
        this.hpGrid[y][x] = 0;

        // Se for verde e NÃO for a zona segura inicial do herói
        if (type === BlockType.EMPTY) {
           const isSafeZone = (x === 1 && y === 1) || (x === 1 && y === 2) || (x === 2 && y === 1);
           if (!isSafeZone) {
               availableGreens.push({x, y});
           }
        }
      }
    }

    // Calcula exatamente 70% da quantidade matemática dos blocos verdes
    const boxCount = Math.floor(availableGreens.length * 0.70);

    // Embaralha o array de posições disponíveis (Fisher-Yates shuffle)
    for (let i = availableGreens.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [availableGreens[i], availableGreens[j]] = [availableGreens[j], availableGreens[i]];
    }

    // Pega as primeiras 'boxCount' posições sorteadas e as transforma em Caixas (Vermelhas)
    for (let i = 0; i < boxCount; i++) {
        const pos = availableGreens[i];
        this.grid[pos.y][pos.x] = BlockType.DESTRUCTIBLE;
        this.hpGrid[pos.y][pos.x] = level;
    }
  }

  public getBlock(x: number, y: number): number {
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) return BlockType.WALL;
    return this.grid[y][x];
  }

  public breakBlock(x: number, y: number, damage: number = 1): boolean {
    if (this.grid[y][x] === BlockType.DESTRUCTIBLE) {
      this.hpGrid[y][x] -= damage;
      if (this.hpGrid[y][x] <= 0) {
        this.grid[y][x] = BlockType.EMPTY;
        this.hpGrid[y][x] = 0;
        return true; 
      }
      return false; 
    }
    return false;
  }

  public getHp(x: number, y: number): number {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      return this.hpGrid[y][x];
    }
    return 0;
  }

  public getRemainingDestructibles(): number {
    let count = 0;
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        if (this.grid[y][x] === BlockType.DESTRUCTIBLE) count++;
      }
    }
    return count;
  }
}
