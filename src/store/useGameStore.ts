import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface HeroData {
  id: string;
  name: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  speed: number;
  power: number;
  maxStamina: number;
  baseCooldown: number;
}

export interface LogEntry {
  id: string;
  type: 'wave' | 'kill' | 'coin' | 'death' | 'box' | 'bomb' | 'info';
  msg: string;
  t: string;
}

export interface GameState {
  gold: number;
  heroes: HeroData[];
  currentLevel: number;
  lastLoginDate: number | null;
  
  // Upgrades Globais
  upgradeMaxStaminaLevel: number;
  upgradeSpeedLevel: number;
  upgradeBombRadiusLevel: number;

  // Novos status UI e engine
  totalKills: number;
  boxesDestroyed: number;
  isPaused: boolean;
  gameSpeed: number;
  logs: LogEntry[];
  
  // Ações
  addGold: (amount: number) => void;
  nextLevel: () => void;
  buyHero: (cost: number) => boolean;
  buyUpgradeStamina: (cost: number) => boolean;
  buyUpgradeSpeed: (cost: number) => boolean;
  buyUpgradeBombRadius: (cost: number) => boolean;
  setLastLoginDate: (timestamp: number) => void;
  resetSave: () => void;

  // Ações Novas
  addLog: (type: LogEntry['type'], msg: string) => void;
  setGameSpeed: (speed: number) => void;
  togglePause: () => void;
  incrementBoxes: () => void;
  incrementKills: () => void;
}

const initialState = {
  gold: 0,
  heroes: [
    {
      id: 'base-1',
      name: 'Classic Bomber',
      rarity: 'Common' as const,
      speed: 3,
      power: 1,
      maxStamina: 15,
      baseCooldown: 3500
    }
  ],
  currentLevel: 1,
  upgradeMaxStaminaLevel: 1,
  upgradeSpeedLevel: 1,
  upgradeBombRadiusLevel: 1,
  lastLoginDate: null,

  totalKills: 0,
  boxesDestroyed: 0,
  isPaused: false,
  gameSpeed: 1,
  logs: [{ id: 'init', type: 'info' as const, msg: 'Bem-vindo ao IDLEBOMB', t: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}],
};

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...initialState,

      addGold: (amount: number) => set((state) => ({ gold: state.gold + amount })),
      
      nextLevel: () => set((state) => {
        const novoLevel = state.currentLevel + 1;
        state.addLog('wave', `Wave ${novoLevel} iniciada!`);
        return { currentLevel: novoLevel };
      }),

      buyHero: (cost: number) => {
        const state = get();
        if (state.gold >= cost) {
          const rand = Math.random();
          let rarity: HeroData['rarity'] = 'Common';
          if (rand > 0.95) rarity = 'Legendary';
          else if (rand > 0.80) rarity = 'Epic';
          else if (rand > 0.50) rarity = 'Rare';

          const newHero: HeroData = {
            id: `hero-${Date.now()}`,
            name: `Bomber #${state.heroes.length + 1}`,
            rarity,
            speed: rarity === 'Legendary' ? 1.5 : (rarity === 'Epic' ? 2 : 3), // Menor = mais rápido
            power: rarity === 'Legendary' ? 4 : (rarity === 'Epic' ? 3 : (rarity === 'Rare' ? 2 : 1)),
            maxStamina: 15 + (state.upgradeMaxStaminaLevel * 2),
            baseCooldown: rarity === 'Legendary' ? 1500 : (rarity === 'Epic' ? 2000 : (rarity === 'Rare' ? 2500 : 3500))
          };
          
          set({
            gold: state.gold - cost,
            heroes: [...state.heroes, newHero]
          });
          get().addLog('coin', `Novo herói ${rarity} adiquirido!`);
          return true;
        }
        return false;
      },

      buyUpgradeStamina: (cost: number) => {
        const state = get();
        if (state.gold >= cost) {
          set({
            gold: state.gold - cost,
            upgradeMaxStaminaLevel: state.upgradeMaxStaminaLevel + 1
          });
          get().addLog('coin', `Melhoria Dano/Vigor \u2192 Nível ${state.upgradeMaxStaminaLevel + 1}`);
          return true;
        }
        return false;
      },

      buyUpgradeSpeed: (cost: number) => {
        const state = get();
        if (state.gold >= cost) {
          set({
            gold: state.gold - cost,
            upgradeSpeedLevel: state.upgradeSpeedLevel + 1
          });
          get().addLog('coin', `Melhoria Velocidade \u2192 Nível ${state.upgradeSpeedLevel + 1}`);
          return true;
        }
        return false;
      },

      buyUpgradeBombRadius: (cost: number) => {
        const state = get();
        if (state.gold >= cost) {
          set({
            gold: state.gold - cost,
            upgradeBombRadiusLevel: state.upgradeBombRadiusLevel + 1
          });
          get().addLog('coin', `Melhoria Raio de Explosão \u2192 Nível ${state.upgradeBombRadiusLevel + 1}`);
          return true;
        }
        return false;
      },
      
      setLastLoginDate: (timestamp: number) => set({ lastLoginDate: timestamp }),

      addLog: (type: LogEntry['type'], msg: string) => {
         set((state) => {
            const now = new Date();
            const t = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            const newLog = { id: Math.random().toString(), type, msg, t };
            return { logs: [newLog, ...state.logs].slice(0, 50) };
         });
      },

      setGameSpeed: (speed: number) => set({ gameSpeed: speed }),
      
      togglePause: () => set((state) => {
         const novoStatus = !state.isPaused;
         state.addLog('info', novoStatus ? 'Jogo Pausado' : 'Jogo Retomado');
         return { isPaused: novoStatus };
      }),

      incrementBoxes: () => set((state) => ({ boxesDestroyed: state.boxesDestroyed + 1 })),
      
      incrementKills: () => set((state) => ({ totalKills: state.totalKills + 1 })),

      resetSave: () => set({ ...initialState, logs: [{ id: 'init', type: 'info', msg: 'Progresso resetado.', t: new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}] })
    }),
    {
      name: 'idle-bomber-save', 
    }
  )
);
