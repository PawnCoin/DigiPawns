import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);
  const [loanValue, setLoanValue] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 4500),
      setTimeout(() => setPhase(4), 6500),
      setTimeout(() => setPhase(5), 9500), // exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  // Animate the loan value number
  useEffect(() => {
    if (phase >= 3) {
      let current = 0;
      const target = 15420;
      const interval = setInterval(() => {
        current += target / 30; // 30 steps roughly
        if (current >= target) {
          current = target;
          clearInterval(interval);
        }
        setLoanValue(Math.floor(current));
      }, 30);
      return () => clearInterval(interval);
    }
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: phase >= 5 ? 0 : 1, scale: phase >= 5 ? 1.1 : 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="absolute inset-0 bg-brand-dark" />
      
      {/* Dynamic Grid Background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `linear-gradient(rgba(212, 160, 23, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(212, 160, 23, 0.2) 1px, transparent 1px)`,
        backgroundSize: '4vw 4vw',
        transform: 'perspective(50vw) rotateX(60deg) translateY(-10vw) translateZ(-20vw)',
      }}>
        <motion.div 
          className="w-full h-full"
          animate={{ y: ['0%', '100%'] }}
          transition={{ repeat: Infinity, duration: 5, ease: 'linear' }}
        />
      </div>

      {/* AI Brain centerpiece */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <motion.div
          className="absolute z-0 w-[40vw] aspect-square rounded-full bg-brand-gold/10 blur-[5vw]"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.img
          src={`${import.meta.env.BASE_URL}images/ai_brain_gold.png`}
          className="relative z-10 w-[30vw] object-contain drop-shadow-[0_0_30px_rgba(212,160,23,0.6)]"
          initial={{ y: '5vw', opacity: 0, filter: 'blur(20px)' }}
          animate={{ y: phase >= 1 ? 0 : '5vw', opacity: phase >= 1 ? 1 : 0, filter: phase >= 1 ? 'blur(0px)' : 'blur(20px)' }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          alt="AI Brain"
        />

        {/* Scan line effect */}
        <motion.div
          className="absolute z-20 w-[35vw] h-[0.5vh] bg-brand-gold shadow-[0_0_20px_#D4A017,0_0_40px_#D4A017]"
          initial={{ top: '10%', opacity: 0 }}
          animate={{ top: phase >= 2 ? ['10%', '90%', '10%'] : '10%', opacity: phase >= 2 && phase < 4 ? [0, 1, 1, 0] : 0 }}
          transition={{ duration: 2.5, ease: 'linear', times: [0, 0.1, 0.9, 1] }}
        />

        {/* Appraisal Value */}
        <motion.div
          className="absolute z-30 flex flex-col items-center backdrop-blur-md bg-brand-navy/60 border border-brand-gold/50 px-[2vw] py-[1vw] rounded-xl shadow-gold-glow"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase >= 3 ? 1 : 0, opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? '-8vw' : 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <span className="text-brand-gold font-sans text-[1vw] font-bold uppercase tracking-widest mb-[0.5vw]">AI Appraised Value</span>
          <span className="text-white font-serif text-[3.5vw] font-bold">${loanValue.toLocaleString()}</span>
        </motion.div>
      </div>

      {/* Typography */}
      <div className="absolute z-30 flex flex-col items-center text-center bottom-[12vh] w-full px-[5vw]">
        <motion.h2
          className="font-serif text-[3.5vw] text-white font-bold mb-[2vh] drop-shadow-lg"
          initial={{ opacity: 0, y: '2vw' }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : '2vw' }}
          transition={{ duration: 1 }}
        >
          DigiPawns: <span className="text-metallic-gold">AI-Powered</span> NFT Pawn
        </motion.h2>
        
        <div className="flex gap-[1.5vw] overflow-hidden">
          <motion.div
            className="font-sans text-[2vw] text-gray-300 font-medium"
            initial={{ x: '-5vw', opacity: 0 }}
            animate={{ x: phase >= 4 ? 0 : '-5vw', opacity: phase >= 4 ? 1 : 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Appraise in seconds.
          </motion.div>
          <motion.div
            className="font-sans text-[2vw] text-brand-gold font-bold"
            initial={{ x: '5vw', opacity: 0 }}
            animate={{ x: phase >= 4 ? 0 : '5vw', opacity: phase >= 4 ? 1 : 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            Instant crypto loans.
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}