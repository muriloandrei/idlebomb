import { useEffect, useState } from 'react';
import { useGameStore } from '../store/useGameStore';

export function OfflineModal() {
  const { heroes, currentLevel, lastLoginDate, setLastLoginDate, addGold } = useGameStore();
  const [offlineGold, setOfflineGold] = useState<number>(0);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [timeAwayStr, setTimeAwayStr] = useState<string>('');

  useEffect(() => {
    const now = Date.now();
    
    // Calcula recompensas offline se houver login anterior
    if (lastLoginDate) {
      const secondsOffline = Math.floor((now - lastLoginDate) / 1000);
      
      // Mínimo de 60 segundos fora para ganhar algo
      if (secondsOffline > 60) {
        // Cálculo DPS aproximado: somatória do power dos heróis * level
        const totalPower = heroes.reduce((acc, h) => acc + h.power, 0);
        const goldPerSecond = (totalPower * currentLevel * 0.5); // Multiplicador base
        
        // Cap offline time to 24 hours (86400 seconds)
        const effectiveSeconds = Math.min(secondsOffline, 86400);
        const earned = Math.floor(goldPerSecond * effectiveSeconds);
        
        if (earned > 0) {
          setOfflineGold(earned);
          
          let timeStr = `${effectiveSeconds} segundos`;
          if (effectiveSeconds >= 3600) {
             timeStr = `${Math.floor(effectiveSeconds / 3600)} horas e ${Math.floor((effectiveSeconds % 3600) / 60)} min`;
          } else if (effectiveSeconds >= 60) {
             timeStr = `${Math.floor(effectiveSeconds / 60)} minutos`;
          }
          
          setTimeAwayStr(timeStr);
          setIsOpen(true);
        }
      }
    }

    // Registra intervalo para ficar atualizando o Last Login Date enquanto logado
    // A cada 30 segundos, salva o momento atual
    const interval = setInterval(() => {
        setLastLoginDate(Date.now());
    }, 30000);
    
    // Set inicial
    setLastLoginDate(now);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isOpen) return null;

  const handleClaim = () => {
    addGold(offlineGold);
    setIsOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-lime-500/10 to-transparent pointer-events-none" />
        
        <h2 className="text-3xl font-black text-white mb-2 tracking-tight">Bem-vindo de volta!</h2>
        <p className="text-slate-400 font-medium mb-6">
          Seus heróis trabalharam duro por <span className="text-lime-400 font-bold">{timeAwayStr}</span> enquanto você estava fora.
        </p>

        <div className="flex flex-col items-center justify-center bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mb-8 shadow-inner">
            <img src="/assets/coin.png" alt="Ouro" className="w-16 h-16 object-contain mb-3 drop-shadow-xl animate-bounce" />
            <div className="text-4xl font-black bg-gradient-to-t from-yellow-600 to-yellow-300 bg-clip-text text-transparent">
                +{offlineGold.toLocaleString()}
            </div>
            <p className="text-xs text-slate-500 font-bold tracking-widest uppercase mt-2">Ouro Coletado</p>
        </div>

        <button 
          onClick={handleClaim}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-lime-500 to-emerald-600 text-white font-black text-lg shadow-[0_0_20px_rgba(132,204,22,0.4)] hover:shadow-[0_0_30px_rgba(132,204,22,0.6)] hover:scale-[1.02] transform transition-all active:scale-[0.98]"
        >
          Resgatar Recompensa
        </button>
      </div>
    </div>
  );
}
