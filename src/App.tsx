import { GameComponent } from './components/GameComponent';
import { OfflineModal } from './components/OfflineModal';
import { useGameStore } from './store/useGameStore';

function App() {
  const { 
    gold, heroes, currentLevel, 
    upgradeMaxStaminaLevel, upgradeSpeedLevel, upgradeBombRadiusLevel, 
    buyHero, buyUpgradeStamina, buyUpgradeSpeed, buyUpgradeBombRadius,
    totalKills, boxesDestroyed, gameSpeed, isPaused, logs,
    setGameSpeed, togglePause, nextLevel
  } = useGameStore();

  const heroCost = 100 * Math.pow(1.5, heroes.length - 1);
  const staminaCost = 75 * Math.pow(1.5, (upgradeMaxStaminaLevel || 1) - 1);
  const speedCost = 50 * Math.pow(1.8, (upgradeSpeedLevel || 1) - 1);
  const radiusCost = 150 * Math.pow(1.6, (upgradeBombRadiusLevel || 1) - 1);

  // Mapeamento de emojis e cores baseados na raridade
  const heroStyleMap = {
    Common: { emoji: '🧨', color: '#f5a623' },
    Rare: { emoji: '💥', color: '#e74c3c' },
    Epic: { emoji: '🔥', color: '#9b59b6' },
    Legendary: { emoji: '⚡', color: '#3498db' }
  };

  return (
    <>
      <OfflineModal />
      
      <header className="retro-header">
        <div className="retro-logo">IDLE<span>BOMB</span></div>
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-val" id="statWave">{currentLevel}</span>
            <span>WAVE</span>
          </div>
          <div className="stat">
            <span className="stat-val" id="statKills">{totalKills}</span>
            <span>KILLS</span>
          </div>
          <div className="stat">
            <span className="stat-val" id="statBoxes">{boxesDestroyed}</span>
            <span>BOXES</span>
          </div>
          <div className="stat">
            <span className="stat-val" id="statCoins">{Math.floor(gold)}</span>
            <span>TOTAL BCOIN</span>
          </div>
        </div>
      </header>

      <main className="retro-main">
        <div className="game-section">
          <div className="arena-wrapper">
            <GameComponent />
            <div className="arena-overlay">
              <div className="wave-num" id="waveDisplay">WAVE {currentLevel}</div>
              <div id="boxCount">Caixas Quebradas: {boxesDestroyed}</div>
              <div id="enemyCount">Heróis Vivos: {heroes.length}</div>
            </div>
          </div>

          <div className="panel-card mt-auto">
            <h3>Controles</h3>
            <div className="controls-row">
              <button 
                className={`control-btn ${!isPaused ? 'primary' : ''}`} 
                onClick={togglePause}
              >
                {!isPaused ? '⏸ PAUSAR' : '▶ RETOMAR'}
              </button>
              <button className="control-btn" onClick={nextLevel}>⏭ PULAR WAVE</button>
              
              <div className="speed-btns">
                {[1, 2, 3].map(speed => (
                  <button 
                    key={speed}
                    onClick={() => setGameSpeed(speed)}
                    className={`speed-btn ${gameSpeed === speed ? 'active' : ''}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
              
              <div className="coin-display" id="coinDisplay">
                {Math.floor(gold)}
              </div>
            </div>
          </div>
        </div>

        <div className="side-panel">
          <div className="panel-card">
            <h3>Heróis</h3>
            <div className="heroes-list" id="heroesList">
              {heroes.map((h) => {
                const style = heroStyleMap[h.rarity];
                // HP visual estático (já que não temos sync tick-a-tick com o phaser para a UI agora)
                const hpPct = 100;
                
                return (
                  <div key={h.id} className="hero-row active" data-id={h.id}>
                    <div className="hero-avatar" style={{ background: `${style.color}22`, borderColor: style.color, color: style.color }}>
                      {style.emoji}
                    </div>
                    <div className="hero-info">
                      <div className="hero-name">{h.name}</div>
                      <div className="hero-stats">
                        <span>HP: <span className="hero-stat-val">{h.maxStamina}</span></span>
                        <span>Tier: <span className="hero-stat-val" style={{color: style.color}}>{h.rarity}</span></span>
                      </div>
                      <div className="hp-bar-wrap">
                        <div className="hp-bar-bg"><div className="hp-bar" style={{ width: `${hpPct}%`, background: '#2ecc71' }}></div></div>
                      </div>
                    </div>
                    <span className="hero-badge badge-active">ATIVO</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="panel-card">
            <h3>Melhorias</h3>
            <div className="upgrades-grid" id="upgradesGrid">
               {/* 1. Comprar Herói (Substituindo 'Raio' visualmente) */}
               <button 
                  className="upgrade-btn" 
                  disabled={gold < heroCost}
                  onClick={() => buyHero(heroCost)}
                >
                  <span className="upgrade-icon">🦸‍♂️</span>
                  <span className="upgrade-name">Novo Herói</span>
                  <span className="upgrade-cost">{Math.floor(heroCost)} BCOIN</span>
                  <span className="upgrade-level font-mono">{heroes.length} Ativos</span>
               </button>

               {/* 2. Cooldown (Substituindo 'Qtd Bombas') */}
               <button 
                  className="upgrade-btn" 
                  disabled={gold < radiusCost}
                  onClick={() => buyUpgradeBombRadius(radiusCost)}
                >
                  <span className="upgrade-icon">💣</span>
                  <span className="upgrade-name">Raio Extra</span>
                  <span className="upgrade-cost">{Math.floor(radiusCost)} BCOIN</span>
                  <span className="upgrade-level">Nível {upgradeBombRadiusLevel}</span>
               </button>

               {/* 3. Speed */}
               <button 
                  className="upgrade-btn" 
                  disabled={gold < speedCost}
                  onClick={() => buyUpgradeSpeed(speedCost)}
                >
                  <span className="upgrade-icon">⚡</span>
                  <span className="upgrade-name">Velocidade</span>
                  <span className="upgrade-cost">{Math.floor(speedCost)} BCOIN</span>
                  <span className="upgrade-level">Nível {upgradeSpeedLevel}</span>
               </button>
               
               {/* 4. Dano (Vigor Max) */}
               <button 
                  className="upgrade-btn" 
                  disabled={gold < staminaCost}
                  onClick={() => buyUpgradeStamina(staminaCost)}
                >
                  <span className="upgrade-icon">🔥</span>
                  <span className="upgrade-name">Vigor Extra</span>
                  <span className="upgrade-cost">{Math.floor(staminaCost)} BCOIN</span>
                  <span className="upgrade-level">Nível {upgradeMaxStaminaLevel}</span>
               </button>
            </div>
          </div>

          <div className="panel-card">
            <h3>Log de Batalha</h3>
            <div className="log-list" id="battleLog">
              {logs.map(log => (
                <div key={log.id} className={`log-entry log-${log.type}`}>
                  <span className="log-time">{log.t}</span>
                  <span className="log-msg">{log.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <div id="particles"></div>
    </>
  );
}

export default App;
