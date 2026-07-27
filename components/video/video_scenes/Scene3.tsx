import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5500),
      setTimeout(() => setPhase(5), 9000), // exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase >= 5 ? 0 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 1.2 }}
    >
      <motion.div className="absolute inset-0 bg-brand-navy" />
      
      {/* Background Particles */}
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/gold_particles_texture.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-screen"
        animate={{ scale: [1, 1.1], opacity: [0.2, 0.4] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear', repeatType: 'reverse' }}
      />

      <div className="relative z-10 w-full flex flex-col items-center justify-center mt-[-10vh]">
        {/* Tokens Container */}
        <div className="flex items-center justify-center gap-[4vw] mb-[6vh] h-[30vh]">
          {/* DIG Token */}
          <motion.div
            className="relative"
            initial={{ x: '-10vw', y: '5vw', opacity: 0, rotateY: 90 }}
            animate={{ x: phase >= 1 ? 0 : '-10vw', y: phase >= 1 ? 0 : '5vw', opacity: phase >= 1 ? 1 : 0, rotateY: phase >= 1 ? 0 : 90 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
          >
            <motion.div
              animate={{ y: ['-1vw', '1vw', '-1vw'], rotateZ: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative rounded-full p-[0.5vw] bg-gradient-to-br from-brand-gold/40 to-transparent shadow-[0_0_40px_rgba(212,160,23,0.4)]"
            >
              <img src={`${import.meta.env.BASE_URL}dig-logo.png`} className="w-[12vw] h-[12vw] object-contain drop-shadow-xl" alt="DIG Token" />
            </motion.div>
            <motion.div 
              className="absolute -bottom-[2vw] left-1/2 -translate-x-1/2 font-sans font-bold text-[1.5vw] text-brand-gold bg-brand-dark/80 px-[1vw] py-[0.25vw] rounded-full border border-brand-gold/30"
              initial={{ scale: 0 }}
              animate={{ scale: phase >= 2 ? 1 : 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              $DIG
            </motion.div>
            <motion.div 
              className="absolute -top-[2.5vw] left-1/2 -translate-x-1/2 font-sans font-bold text-[1.2vw] text-green-400 whitespace-nowrap"
              initial={{ opacity: 0, y: '1vw' }}
              animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : '1vw' }}
              transition={{ duration: 0.5 }}
            >
              25% OFF FEES
            </motion.div>
          </motion.div>

          {/* PC Token */}
          <motion.div
            className="relative"
            initial={{ x: '10vw', y: '5vw', opacity: 0, rotateY: -90 }}
            animate={{ x: phase >= 1 ? 0 : '10vw', y: phase >= 1 ? 0 : '5vw', opacity: phase >= 1 ? 1 : 0, rotateY: phase >= 1 ? 0 : -90 }}
            transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
          >
            <motion.div
              animate={{ y: ['1vw', '-1vw', '1vw'], rotateZ: [5, -5, 5] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="relative rounded-full p-[0.5vw] bg-gradient-to-br from-blue-500/40 to-transparent shadow-[0_0_40px_rgba(59,130,246,0.4)]"
            >
              <img src={`${import.meta.env.BASE_URL}pc-logo.png`} className="w-[12vw] h-[12vw] object-contain drop-shadow-xl" alt="PC Token" />
            </motion.div>
            <motion.div 
              className="absolute -bottom-[2vw] left-1/2 -translate-x-1/2 font-sans font-bold text-[1.5vw] text-blue-400 bg-brand-dark/80 px-[1vw] py-[0.25vw] rounded-full border border-blue-400/30"
              initial={{ scale: 0 }}
              animate={{ scale: phase >= 2 ? 1 : 0 }}
              transition={{ type: 'spring', delay: 0.4 }}
            >
              $PC
            </motion.div>
            <motion.div 
              className="absolute -top-[2.5vw] left-1/2 -translate-x-1/2 font-sans font-bold text-[1.2vw] text-green-400 whitespace-nowrap"
              initial={{ opacity: 0, y: '1vw' }}
              animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : '1vw' }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              20% OFF FEES
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Typography */}
      <div className="absolute z-20 flex flex-col items-center bottom-[15vh]">
        <motion.div className="overflow-hidden mb-[1vh]">
          <motion.h2
            className="font-serif text-[4vw] text-white font-bold tracking-tight text-center"
            initial={{ y: "100%" }}
            animate={{ y: phase >= 4 ? "0%" : "100%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            Hold <span className="text-brand-gold">$DIG</span> or <span className="text-blue-400">$PC</span>.
          </motion.h2>
        </motion.div>
        <motion.div className="overflow-hidden">
          <motion.p
            className="font-sans text-[2vw] text-gray-300 font-medium text-center"
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: phase >= 4 ? "0%" : "-100%", opacity: phase >= 4 ? 1 : 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            Pay less fees. Keep more value.
          </motion.p>
        </motion.div>
        
        {/* Swap indicator */}
        <motion.div 
          className="mt-[4vh] flex items-center gap-[1vw] text-brand-gold/60 font-sans text-[1.2vw] border border-brand-gold/20 rounded-full px-[1.5vw] py-[0.5vw] bg-brand-dark/50"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: phase >= 4 ? 1 : 0, scale: phase >= 4 ? 1 : 0.8 }}
          transition={{ delay: 0.6 }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-[1.5vw] h-[1.5vw]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5"/><path d="M21 3 9 15"/><path d="M21 16v5h-5"/><path d="M21 21 15 15"/><path d="M3 21h5v-5"/><path d="M3 21 15 9"/><path d="M3 8v-5h5"/><path d="M3 3 9 9"/></svg>
          Swappable in-app via Uniswap & Jupiter
        </motion.div>
      </div>
    </motion.div>
  );
}