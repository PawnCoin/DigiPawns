import React, { useState } from 'react';
import HeroSection from '../components/HeroSection';
import HowItWorks from '../components/HowItWorks';
import PawnForm from '../components/PawnForm';
import FeaturedNfts from '../components/FeaturedNfts';
import Faq from '../components/Faq';
import AcceptedCurrencies from '../components/AcceptedCurrencies';
import NftCategories from '../components/NftCategories';
import LoanCalculatorModal from '../components/LoanCalculatorModal';
import { motion } from 'framer-motion';

const HomePage: React.FC = () => {
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
        >
            <main className="container mx-auto px-4 sm:px-6 lg:px-8">
                <HeroSection onCalculatorOpen={() => setIsCalculatorOpen(true)} />
                <HowItWorks />
                <AcceptedCurrencies />
                <NftCategories />
                <PawnForm />
                <FeaturedNfts />
                <Faq />
            </main>
            <LoanCalculatorModal 
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
            />
        </motion.div>
    );
};

export default HomePage;