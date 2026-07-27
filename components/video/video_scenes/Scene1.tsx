import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 4500),
      setTimeout(() => setPhase(4), 7000), // start exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: phase >= 4 ? 0 : 1 }}
      exit={{ opacity: 0, scale: 1.1, filter: 'blur(10px)' }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Background layer */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-brand-dark via-[#080d19] to-brand-navy"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute inset-0 bg-black/40" />

      {/* Midground - Floating Shapes */}
      <motion.div
        className="absolute w-[40vw] h-[40vw] border border-brand-gold/10 rounded-full"
        animate={{ rotate: 360, scale: [1, 1.05, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute w-[60vw] h-[60vw] border border-brand-gold/5 rounded-full"
        animate={{ rotate: -360, scale: [1, 1.02, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      />

      {/* Centerpiece Image - Frozen/Locked NFT */}
      <motion.div
        className="relative z-10 w-[25vw] h-[25vw] rounded-2xl overflow-hidden shadow-gold-glow border border-brand-gold/30"
        initial={{ opacity: 0, scale: 0.8, y: '5vw' }}
        animate={{
          opacity: phase >= 1 ? 1 : 0,
          scale: phase >= 1 ? 1 : 0.8,
          y: phase >= 1 ? 0 : '5vw',
          filter: phase >= 2 ? 'grayscale(80%) brightness(0.5)' : 'grayscale(0%) brightness(1)',
        }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/nft_art_1.jpg`}
          className="w-full h-full object-cover"
          alt="NFT Art"
        />
        {/* Lock Overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-brand-dark/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 1 }}
        >
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: phase >= 2 ? 1 : 0, rotate: phase >= 2 ? 0 : -15 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.3 }}
            className="text-brand-gold w-[6vw] h-[6vw]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Typography */}
      <div className="absolute z-20 flex flex-col items-center justify-center bottom-[15vh]">
        <motion.h1
          className="font-serif text-[4vw] font-bold text-white tracking-tight"
          initial={{ opacity: 0, y: '3vw' }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : '3vw' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        >
          Your NFTs hold value.
        </motion.h1>
        <div className="overflow-hidden mt-[2vh]">
          <motion.h2
            className="font-sans text-[2.5vw] font-semibold text-brand-gold tracking-wide"
            initial={{ y: "100%" }}
            animate={{ y: phase >= 3 ? "0%" : "100%" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            But that liquidity is locked.
          </motion.h2>
        </div>
      </div>
    </motion.div>
  );
}