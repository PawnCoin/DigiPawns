import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 7500), // exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const chains = [
    { name: 'Ethereum', color: '#627EEA', delay: 0 },
    { name: 'Solana', color: '#14F195', delay: 0.2 },
    { name: 'Polygon', color: '#8247E5', delay: 0.4 },
    { name: 'Base', color: '#0052FF', delay: 0.6 },
  ];

  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 1.5 }}
      animate={{ opacity: phase >= 5 ? 0 : 1, scale: phase >= 5 ? 0.8 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="absolute inset-0 bg-brand-dark" />
      
      {/* Background Rings */}
      <div className="absolute inset-0 flex items-center justify-center opacity-30">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-brand-gold/20"
            style={{ width: `${i * 20}vw`, height: `${i * 20}vw` }}
            animate={{ rotate: 360, scale: [1, 1.05, 1] }}
            transition={{ duration: 20 * i, repeat: Infinity, ease: 'linear' }}
          />
        ))}
      </div>

      {/* Central Node */}
      <motion.div 
        className="relative z-10 w-[8vw] h-[8vw] rounded-full bg-brand-gold shadow-[0_0_50px_rgba(212,160,23,0.8)] flex items-center justify-center mb-[6vh]"
        initial={{ scale: 0 }}
        animate={{ scale: phase >= 1 ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div className="w-[5vw] h-[5vw] rounded-full bg-brand-dark border-[0.5vw] border-brand-gold" />
      </motion.div>

      {/* Chains Layout */}
      <div className="relative z-20 flex flex-wrap justify-center gap-[4vw] w-full max-w-[80vw] px-[4vw]">
        {chains.map((chain, i) => (
          <motion.div
            key={chain.name}
            className="flex flex-col items-center"
            initial={{ opacity: 0, y: '5vw' }}
            animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : '5vw' }}
            transition={{ duration: 0.8, delay: chain.delay, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Connecting line (pseudo) */}
            <motion.div 
              className="w-[0.5vw] h-[6vw] bg-gradient-to-t from-transparent to-brand-gold/50 mb-[2vh]"
              initial={{ scaleY: 0, originY: 0 }}
              animate={{ scaleY: phase >= 3 ? 1 : 0 }}
              transition={{ duration: 0.5, delay: chain.delay + 0.3 }}
            />
            <div 
              className="text-[2.5vw] font-sans font-bold tracking-wider"
              style={{ color: chain.color, textShadow: `0 0 20px ${chain.color}80` }}
            >
              {chain.name}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Typography */}
      <div className="absolute bottom-[15vh] z-30 flex flex-col items-center">
        <motion.h3
          className="font-serif text-[4vw] text-white font-bold tracking-tight mt-[4vh] text-center drop-shadow-lg"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: phase >= 4 ? 1 : 0, scale: phase >= 4 ? 1 : 0.9 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          One platform for all your assets.
        </motion.h3>
      </div>
    </motion.div>
  );
}