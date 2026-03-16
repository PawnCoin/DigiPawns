import React, { useState, useEffect } from 'react';
import type { NftAppraisal, Loan, LoanTerms } from '../types';
import { WalletIcon, CheckCircleIcon, ErrorIcon } from './IconComponents';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    appraisal: NftAppraisal;
    nftDetails: { name: string; collection: string };
    loanTerms: LoanTerms;
    onSuccess: (newLoan: Loan) => void;
}

type TransactionStep = 'initial' | 'approving' | 'confirming' | 'success' | 'error';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, appraisal, nftDetails, loanTerms, onSuccess }) => {
    const [step, setStep] = useState<TransactionStep>('initial');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setStep('initial');
            setErrorMessage('');
        }
    }, [isOpen]);

    const handleStartTransaction = () => {
        setStep('approving');
        // Simulate blockchain delay
        setTimeout(() => {
            // Simulate random failure
            if (Math.random() < 0.1) { // 10% chance of failure
                setErrorMessage("User rejected the transaction in their wallet.");
                setStep('error');
            } else {
                setStep('confirming');
                setTimeout(() => {
                    const newLoan: Loan = {
                        id: `LN${Math.floor(Math.random() * 10000)}`,
                        nft: {
                            ...nftDetails,
                            imageUrl: '/placeholder-generic.png'
                        },
                        principal: appraisal.suggestedLoanUSD,
                        interestRate: loanTerms.interestRate,
                        dueDate: new Date(Date.now() + loanTerms.termLength * 24 * 60 * 60 * 1000).toISOString(),
                        repaymentAmount: loanTerms.repaymentAmount,
                        status: 'Active',
                    };
                    onSuccess(newLoan);
                    setStep('success');
                }, 2500);
            }
        }, 2000);
    };

    const renderContent = () => {
        switch (step) {
            case 'initial':
                return (
                    <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
                            <WalletIcon className="h-8 w-8 text-blue-300" />
                        </div>
                        <h3 className="text-2xl font-semibold text-center mt-4">Confirm Your Loan</h3>
                        <p className="text-gray-400 text-center mt-2">You are about to take a loan against your NFT. Review the details below.</p>
                        <div className="mt-6 space-y-3 bg-gray-900/50 p-4 rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Asset:</span>
                                <span className="font-medium text-right">{nftDetails.name}<br /><span className="text-xs text-gray-500">{nftDetails.collection}</span></span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Loan Amount:</span>
                                <span className="font-bold text-lg text-white">${appraisal.suggestedLoanUSD.toLocaleString()}</span>
                            </div>
                             <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Term:</span>
                                <span className="font-medium">{loanTerms.termLength} Days</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Interest (APR):</span>
                                <span className="font-medium">{loanTerms.interestRate.toFixed(1)}%</span>
                            </div>
                            <div className="flex justify-between text-sm pt-2 border-t border-gray-700 mt-2">
                                <span className="text-gray-400 font-bold">Total Repayment:</span>
                                <span className="font-bold text-lg text-blue-300">${loanTerms.repaymentAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                            </div>
                        </div>
                        <button onClick={handleStartTransaction} className="w-full mt-6 bg-brand-blue-light text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-500 transition-all">
                            Proceed in Wallet
                        </button>
                    </>
                );
            case 'approving':
                return (
                    <div className="text-center">
                        <Spinner />
                        <h3 className="text-xl font-semibold mt-4">Approve NFT Transfer</h3>
                        <p className="text-gray-400 mt-2">Please approve the transaction in your wallet to transfer the NFT to our secure vault.</p>
                    </div>
                );
            case 'confirming':
                 return (
                    <div className="text-center">
                        <Spinner />
                        <h3 className="text-xl font-semibold mt-4">Confirming Loan...</h3>
                        <p className="text-gray-400 mt-2">Waiting for blockchain confirmation. Your funds will be disbursed shortly.</p>
                    </div>
                );
            case 'success':
                 return (
                    <div className="text-center">
                         <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto" />
                        <h3 className="text-xl font-semibold mt-4">Loan Successful!</h3>
                        <p className="text-gray-400 mt-2">The loan amount has been sent to your wallet. Your new loan is now visible in your dashboard.</p>
                        <button onClick={onClose} className="w-full mt-6 bg-brand-blue-light text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-500">
                            View My Dashboard
                        </button>
                    </div>
                );
            case 'error':
                 return (
                    <div className="text-center">
                         <ErrorIcon className="h-16 w-16 text-red-400 mx-auto" />
                        <h3 className="text-xl font-semibold mt-4">Transaction Failed</h3>
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

export default TransactionModal;