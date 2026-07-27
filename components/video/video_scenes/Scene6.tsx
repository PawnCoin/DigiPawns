import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 4500),
      setTimeout(() => setPhase(4), 7500), // Start exit before loop
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase >= 4 ? 0 : 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
    >
      <motion.div className="absolute inset-0 bg-gradient-to-t from-[#050810] to-brand-navy" />
      
      {/* Dynamic Background Flare */}
      <motion.div
        className="absolute w-[80vw] h-[80vw] bg-brand-gold/10 rounded-full blur-[10vw]"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: phase >= 1 ? 1 : 0, opacity: phase >= 1 ? 0.4 : 0 }}
        transition={{ duration: 3, ease: 'easeOut' }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Logo */}
        <motion.div
          className="relative mb-[6vh]"
          initial={{ opacity: 0, scale: 0.8, y: '3vw' }}
          animate={{ opacity: phase >= 1 ? 1 : 0, scale: phase >= 1 ? 1 : 0.8, y: phase >= 1 ? 0 : '3vw' }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <img 
            src={`${import.meta.env.BASE_URL}digipawns-logo.png`} 
            className="w-[20vw] h-[20vw] object-contain drop-shadow-[0_0_30px_rgba(212,160,23,0.5)]" 
            alt="DigiPawns Logo" 
          />
          {/* Logo glow pulse */}
          <motion.div
            className="absolute inset-0 bg-brand-gold/30 rounded-full blur-2xl -z-10"
            animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        {/* Tagline */}
        <motion.h1
          className="font-serif text-[4vw] text-white font-bold text-center tracking-tight leading-tight max-w-[80vw]"
          initial={{ opacity: 0, y: '2vw' }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : '2vw' }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        >
          Unlock the Value of Your <span className="text-metallic-gold">Digital Assets</span>
        </motion.h1>

        {/* CTA */}
        <motion.div
          className="mt-[6vh]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, scale: phase >= 3 ? 1 : 0.9 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="btn-metallic-gold px-[4vw] py-[1.5vw] rounded-full font-sans text-[1.5vw] uppercase tracking-widest cursor-default">
            Start Earning More Today
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}