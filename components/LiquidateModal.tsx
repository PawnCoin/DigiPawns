import React, { useState, useEffect } from 'react';
import type { Loan } from '../types';
import { GavelIcon, CheckCircleIcon, ErrorIcon } from './IconComponents';

interface LiquidateModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan;
    onSuccess: () => void;
}

type LiquidateStep = 'initial' | 'processing' | 'success' | 'error';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const LiquidateModal: React.FC<LiquidateModalProps> = ({ isOpen, onClose, loan, onSuccess }) => {
    const [step, setStep] = useState<LiquidateStep>('initial');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep('initial');
            setErrorMessage('');
        }
    }, [isOpen]);

    const handleStartLiquidation = () => {
        setStep('processing');
        setTimeout(() => {
            if (Math.random() < 0.05) { // 5% chance of failure
                setErrorMessage("Liquidation transaction failed due to a network error.");
                setStep('error');
            } else {
                onSuccess();
                setStep('success');
            }
        }, 2500);
    };

    const renderContent = () => {
        switch (step) {
            case 'initial':
                return (
                    <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                            <GavelIcon className="h-8 w-8 text-red-300" />
                        </div>
                        <h3 className="text-2xl font-semibold text-center mt-4">Confirm Collateral Liquidation</h3>
                        <p className="text-gray-400 text-center mt-2">This action is irreversible. By proceeding, you forfeit ownership of the NFT collateral to DigiPawns.</p>
                        <div className="mt-6 space-y-3 bg-red-900/20 p-4 rounded-lg border border-red-700/50">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Asset to Forfeit:</span>
                                <span className="font-medium text-right text-red-200">{loan.nft.name}</span>
                            </div>
                            <div className="flex justify-between text-sm items-baseline">
                                <span className="text-gray-400">Original Loan:</span>
                                <span className="font-bold text-lg text-white">${loan.principal.toLocaleString()}</span>
                            </div>
                        </div>
                        <button onClick={handleStartLiquidation} className="w-full mt-6 bg-red-600 text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-red-500 transition-all">
                            I Understand, Liquidate My Asset
                        </button>
                    </>
                );
            case 'processing':
                return (
                     <div className="text-center">
                        <Spinner />
                        <h3 className="text-xl font-semibold mt-4">Processing Liquidation</h3>
                        <p className="text-gray-400 mt-2">Finalizing the transfer of collateral. This may take a moment.</p>
                    </div>
                );
            case 'success':
                 return (
                    <div className="text-center">
                         <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto" />
                        <h3 className="text-xl font-semibold mt-4">Liquidation Complete</h3>
                        <p className="text-gray-400 mt-2">The collateral has been liquidated. This loan is now closed and removed from your dashboard.</p>
                        <button onClick={onClose} className="w-full mt-6 bg-gray-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-gray-500">
                            Close
                        </button>
                    </div>
                );
            case 'error':
                 return (
                    <div className="text-center">
                         <ErrorIcon className="h-16 w-16 text-red-400 mx-auto" />
                        <h3 className="text-xl font-semibold mt-4">Liquidation Failed</h3>
                        <p className="text-gray-400 mt-2 bg-red-900/50 p-3 rounded-md">{errorMessage}</p>
                         <button onClick={onClose} className="w-full mt-6 bg-gray-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-gray-500">
                            Close
                        </button>
                    </div>
                );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-gray border border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">&times;</button>
                {renderContent()}
            </div>
        </div>
    );
};

export default LiquidateModal;