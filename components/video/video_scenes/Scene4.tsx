import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 9000), // exit
    ];
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const cards = [
    { id: 1, img: 'nft_art_1.jpg', price: '2.4 ETH', delay: 0 },
    { id: 2, img: 'nft_art_2.jpg', price: '45 SOL', delay: 0.2 },
    { id: 3, img: 'luxury_vault.jpg', price: '1,200 POL', delay: 0.4 },
  ];

  return (
    <motion.div
      className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden"
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: phase >= 4 ? 0 : 1, x: phase >= 4 ? '-100%' : '0%' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="absolute inset-0 bg-brand-dark" />

      {/* Typography - Top */}
      <div className="absolute top-[15vh] z-30 flex flex-col items-center">
        <motion.h2
          className="font-serif text-[4vw] text-white font-bold tracking-tight text-center drop-shadow-lg"
          initial={{ opacity: 0, y: '-3vw' }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : '-3vw' }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          The <span className="text-metallic-gold italic">Shop Floor</span>
        </motion.h2>
        <motion.p
          className="font-sans text-[2vw] text-gray-300 font-medium text-center mt-[2vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 2 ? 1 : 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          Buy, sell, and trade liquidated assets.
        </motion.p>
      </div>

      {/* Gallery */}
      <div className="relative z-20 w-full mt-[10vh] flex items-center justify-center gap-[4vw]" style={{ perspective: '100vw' }}>
        {cards.map((card, i) => {
          const isCenter = i === 1;
          return (
            <motion.div
              key={card.id}
              className={`relative rounded-[1vw] overflow-hidden border border-brand-gold/30 bg-brand-navy shadow-gold-glow flex-shrink-0`}
              style={{
                width: isCenter ? '25vw' : '20vw',
                height: isCenter ? '35vw' : '28vw',
                zIndex: isCenter ? 30 : 20,
              }}
              initial={{ 
                opacity: 0, 
                rotateY: isCenter ? 0 : (i === 0 ? 30 : -30),
                z: isCenter ? 100 : -100,
                y: '10vw'
              }}
              animate={{ 
                opacity: phase >= 3 ? 1 : 0, 
                y: phase >= 3 ? 0 : '10vw',
                rotateY: phase >= 3 ? (isCenter ? 0 : (i === 0 ? 15 : -15)) : (i === 0 ? 30 : -30),
              }}
              transition={{ 
                duration: 1.2, 
                delay: card.delay, 
                ease: [0.16, 1, 0.3, 1] 
              }}
            >
              <img 
                src={`${import.meta.env.BASE_URL}images/${card.img}`} 
                className="w-full h-full object-cover"
                alt="NFT Art"
              />
              
              {/* Card overlay */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-dark via-brand-dark/80 to-transparent p-[1.5vw] pt-[3vw]">
                <div className="flex justify-between items-end">
                  <div className="font-sans font-bold text-[1vw] text-white">Featured Asset</div>
                  <div className="font-sans font-bold text-[1.2vw] text-brand-gold">{card.price}</div>
                </div>
                <motion.div 
                  className="mt-[1vw] w-full py-[0.5vw] rounded-[0.5vw] bg-brand-gold/20 border border-brand-gold/50 text-center font-sans font-semibold text-brand-gold text-[0.8vw] uppercase tracking-wider"
                  whileHover={{ backgroundColor: 'rgba(212,160,23,0.4)' }}
                >
                  Acquire Asset
                </motion.div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </motion.div>
  );
}