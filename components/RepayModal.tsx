import React, { useState, useEffect } from 'react';
import type { Loan, CryptoCurrency } from '../types';
import { ArrowUpCircleIcon, CheckCircleIcon, ErrorIcon, ChevronDownIcon } from './IconComponents';
import { ACCEPTED_CURRENCIES } from '../constants';

interface RepayModalProps {
    isOpen: boolean;
    onClose: () => void;
    loan: Loan;
    onSuccess: () => void;
}

type RepayStep = 'initial' | 'processing' | 'success' | 'error';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const RepayModal: React.FC<RepayModalProps> = ({ isOpen, onClose, loan, onSuccess }) => {
    const [step, setStep] = useState<RepayStep>('initial');
    const [errorMessage, setErrorMessage] = useState('');
    const [selectedCurrency, setSelectedCurrency] = useState<CryptoCurrency>(ACCEPTED_CURRENCIES[1]); // Default to ETH
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setStep('initial');
            setErrorMessage('');
            setIsDropdownOpen(false); // Reset dropdown on modal open
        }
    }, [isOpen]);

    const handleStartRepayment = () => {
        setStep('processing');
        setTimeout(() => {
            if (Math.random() < 0.1) { // 10% chance of failure
                setErrorMessage("Transaction failed. Insufficient funds or network error.");
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
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
                            <ArrowUpCircleIcon className="h-8 w-8 text-blue-300" />
                        </div>
                        <h3 className="text-2xl font-semibold text-center mt-4">Repay Your Loan</h3>
                        <p className="text-gray-400 text-center mt-2">Select a currency to repay your loan and reclaim your NFT.</p>
                        <div className="mt-6 space-y-3 bg-gray-900/50 p-4 rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Asset to Reclaim:</span>
                                <span className="font-medium text-right">{loan.nft.name}</span>
                            </div>
                            <div className="flex justify-between text-sm items-baseline">
                                <span className="text-gray-400">Total Repayment:</span>
                                <span className="font-bold text-lg text-white">${loan.repaymentAmount.toLocaleString()}</span>
                            </div>
                        </div>
                        
                        <div className="mt-4">
                            <label htmlFor="currency-select" className="text-sm font-medium text-gray-300 mb-2 block">Pay with:</label>
                            <div className="relative">
                                <button
                                    id="currency-select"
                                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                    className="w-full flex items-center justify-between p-3 rounded-md border-2 bg-gray-800/50 border-gray-700 hover:border-gray-600"
                                >
                                    <div className="flex items-center space-x-3">
                                        {React.cloneElement(selectedCurrency.icon as React.ReactElement, { className: "w-6 h-6"})}
                                        <span className="font-semibold">{selectedCurrency.name} ({selectedCurrency.ticker})</span>
                                    </div>
                                    <ChevronDownIcon className={`w-5 h-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isDropdownOpen && (
                                    <div className="absolute z-10 mt-1 w-full bg-brand-gray border border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        <ul className="py-1">
                                            {ACCEPTED_CURRENCIES.map(currency => (
                                                <li key={currency.ticker}>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCurrency(currency);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-200 hover:bg-blue-900/50"
                                                    >
                                                        {React.cloneElement(currency.icon as React.ReactElement, { className: "w-6 h-6"})}
                                                        <span>{currency.name} ({currency.ticker})</span>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button onClick={handleStartRepayment} className="w-full mt-6 bg-brand-blue-light text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-500 transition-all">
                            Confirm Repayment
                        </button>
                    </>
                );
            case 'processing':
                return (
                     <div className="text-center">
                        <Spinner />
                        <h3 className="text-xl font-semibold mt-4">Processing Repayment</h3>
                        <p className="text-gray-400 mt-2">Confirm the transaction in your wallet to send the funds and reclaim your NFT.</p>
                    </div>
                );
            case 'success':
                 return (
                    <div className="text-center">
                         <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto" />
                        <h3 className="text-xl font-semibold mt-4">Repayment Successful!</h3>
                        <p className="text-gray-400 mt-2">Your NFT has been returned to your wallet. The loan is now marked as 'Repaid'.</p>
                        <button onClick={onClose} className="w-full mt-6 bg-gray-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-gray-500">
                            Close
                        </button>
                    </div>
                );
            case 'error':
                 return (
                    <div className="text-center">
                         <ErrorIcon className="h-16 w-16 text-red-400 mx-auto" />
                        <h3 className="text-xl font-semibold mt-4">Repayment Failed</h3>
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

export default RepayModal;
