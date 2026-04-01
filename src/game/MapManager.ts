export const BlockType = {
  EMPTY: 0,
  WALL: 1, // Indestrutível
  DESTRUCTIBLE: 2 // Destrutível
} as const;

export type BlockType = typeof BlockType[keyof typeof BlockType];

export class MapManager {
  public cols: number;
  public rows: number;
  public grid: number[][]; // Matriz mantendo os tipos
  public hpGrid: number[][];

  constructor(cols: number = 15, rows: number = 11, level: number = 1) {
    this.cols = cols;
    this.rows = rows;
    this.grid = [];
    this.hpGrid = [];
    this.generateMap(level);
  }

  public generateMap(level: number) {
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      this.grid[y] = [];
      this.hpGrid[y] = [];
      for (let x = 0; x < this.cols; x++) {
        // 1. Bordas do mapa são paredes indestrutíveis
        if (x === 0 || x === this.cols - 1 || y === 0 || y === this.rows - 1) {
          this.grid[y][x] = BlockType.WALL;
          this.hpGrid[y][x] = 0;
        }
        // 2. Pilares em posições pares x pares dentro da área jogável
        else if (x % 2 === 0 && y % 2 === 0) {
          this.grid[y][x] = BlockType.WALL;
          this.hpGrid[y][x] = 0;
        }
        // 3. Spawn point (1,1), (1,2), (2,1) deve ser sempre vazio para o herói nascer
        else if ((x === 1 && y === 1) || (x === 1 && y === 2) || (x === 2 && y === 1)) {
          this.grid[y][x] = BlockType.EMPTY;
          this.hpGrid[y][x] = 0;
        }
        // 4. Espaços restantes têm 60% de chance de serem Blocos Destrutíveis
        else {
          const isDestructible = Math.random() < 0.6;
          this.grid[y][x] = isDestructible ? BlockType.DESTRUCTIBLE : BlockType.EMPTY;
          this.hpGrid[y][x] = isDestructible ? level : 0;
        }
      }
    }
  }

  // Permite saber o estado de um bloco rapidamente (usado por IA e bomb explosion)
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
