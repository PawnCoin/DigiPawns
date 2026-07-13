import React, { useState, useEffect, useCallback } from 'react';
import type { NftAppraisal, Loan, LoanTerms } from '../types';
import { WalletIcon, CheckCircleIcon, ErrorIcon } from './IconComponents';
import { useEscrowDeposit, type DepositStep } from '../hooks/useEscrow';
import { ESCROW_ADDRESS } from '../services/escrowService';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    appraisal: NftAppraisal;
    nftDetails: { name: string; collection: string };
    loanTerms: LoanTerms;
    onSuccess: (newLoan: Loan) => void;
    /** Real NFT contract address — enables on-chain escrow deposit when set. */
    contractAddress?: string;
    /** Real NFT token ID — enables on-chain escrow deposit when set. */
    tokenId?: string;
    /** Pre-generated uint256 loan ID (as BigInt string) used on-chain. */
    numericLoanId?: bigint;
}

type TransactionStep = 'initial' | 'approving' | 'depositing' | 'success' | 'error';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-8 w-8 text-brand-gold" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
);

const TransactionModal: React.FC<TransactionModalProps> = ({
    isOpen, onClose, appraisal, nftDetails, loanTerms, onSuccess,
    contractAddress, tokenId, numericLoanId,
}) => {
    const [step, setStep] = useState<TransactionStep>('initial');
    const [errorMessage, setErrorMessage] = useState('');
    const { approveAndDeposit, escrowReady } = useEscrowDeposit();

    // Whether we have enough data for a real on-chain flow
    const useOnChain = escrowReady && !!contractAddress && !!tokenId && !!numericLoanId;

    useEffect(() => {
        if (isOpen) { setStep('initial'); setErrorMessage(''); }
    }, [isOpen]);

    const buildLoan = useCallback((): Loan => ({
        id: `LN${Math.floor(Math.random() * 10000)}`,
        nft: { ...nftDetails, imageUrl: '/placeholder-generic.png' },
        contractAddress: contractAddress || '',
        tokenId: tokenId || '',
        numericLoanId: numericLoanId?.toString(),
        principal: appraisal.suggestedLoanUSD,
        interestRate: loanTerms.interestRate,
        dueDate: new Date(Date.now() + loanTerms.termLength * 24 * 60 * 60 * 1000).toISOString(),
        repaymentAmount: loanTerms.repaymentAmount,
        status: 'Active',
        nftTransferStatus: useOnChain ? 'received' : 'awaiting_transfer',
    }), [nftDetails, contractAddress, tokenId, numericLoanId, appraisal, loanTerms, useOnChain]);

    const handleStartTransaction = async () => {
        try {
            if (useOnChain) {
                // ── Real on-chain flow ───────────────────────────────────────
                await approveAndDeposit(
                    numericLoanId!,
                    contractAddress as `0x${string}`,
                    BigInt(tokenId!),
                    (depositStep: DepositStep) => {
                        setStep(depositStep === 'approving' ? 'approving' : 'depositing');
                    }
                );
            } else {
                // ── Simulated flow (no escrow deployed / no NFT data) ────────
                setStep('approving');
                await new Promise(res => setTimeout(res, 1800));
                if (Math.random() < 0.08) {
                    throw new Error('User rejected the transaction in their wallet.');
                }
                setStep('depositing');
                await new Promise(res => setTimeout(res, 2200));
            }
            onSuccess(buildLoan());
            setStep('success');
        } catch (err: unknown) {
            setErrorMessage(
                err instanceof Error ? err.message : 'Transaction failed. Please try again.'
            );
            setStep('error');
        }
    };

    const renderContent = () => {
        switch (step) {
            case 'initial':
                return (
                    <>
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-gold/20">
                            <WalletIcon className="h-8 w-8 text-brand-gold" />
                        </div>
                        <h3 className="text-2xl font-semibold text-center mt-4">Confirm Your Loan</h3>
                        <p className="text-gray-400 text-center mt-2">
                            {useOnChain
                                ? 'Two wallet signatures required: approve the NFT transfer, then deposit into escrow.'
                                : 'Review the details below and confirm.'}
                        </p>
                        <div className="mt-6 space-y-3 bg-brand-dark/50 p-4 rounded-lg">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Asset:</span>
                                <span className="font-medium text-right">
                                    {nftDetails.name}<br />
                                    <span className="text-xs text-gray-500">{nftDetails.collection}</span>
                                </span>
                            </div>
                            {useOnChain && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-400">Contract:</span>
                                    <span className="font-mono text-xs text-gray-300">
                                        {contractAddress!.slice(0, 8)}…{contractAddress!.slice(-6)}
                                    </span>
                                </div>
                            )}
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
                            <div className="flex justify-between text-sm pt-2 border-t border-yellow-900/30 mt-2">
                                <span className="text-gray-400 font-bold">Total Repayment:</span>
                                <span className="font-bold text-lg text-brand-gold">
                                    ${loanTerms.repaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                        {useOnChain && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-green-400 bg-green-900/20 border border-green-700/40 rounded-lg px-3 py-2">
                                <span className="w-2 h-2 bg-green-400 rounded-full flex-shrink-0" />
                                NFT will be deposited into the on-chain escrow vault
                            </div>
                        )}
                        {!useOnChain && ESCROW_ADDRESS && (
                            <div className="mt-3 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-700/40 rounded-lg px-3 py-2">
                                <span>⚠</span> Simulated — enter a real contract address &amp; token ID to use escrow
                            </div>
                        )}
                        <button
                            onClick={handleStartTransaction}
                            className="w-full mt-6 bg-brand-gold text-brand-dark font-bold py-3 px-6 rounded-lg text-lg hover:bg-brand-gold-light transition-all"
                        >
                            {useOnChain ? 'Sign in Wallet (2 steps)' : 'Proceed in Wallet'}
                        </button>
                    </>
                );

            case 'approving':
                return (
                    <div className="text-center">
                        <Spinner />
                        <h3 className="text-xl font-semibold mt-4">
                            {useOnChain ? 'Step 1 of 2 — Approve NFT Transfer' : 'Approve NFT Transfer'}
                        </h3>
                        <p className="text-gray-400 mt-2">
                            {useOnChain
                                ? 'Sign the approval in your wallet to allow the escrow contract to move your NFT.'
                                : 'Please approve the transaction in your wallet.'}
                        </p>
                        {useOnChain && (
                            <p className="mt-3 text-xs text-gray-500">Waiting for confirmation on Base Sepolia…</p>
                        )}
                    </div>
                );

            case 'depositing':
                return (
                    <div className="text-center">
                        <Spinner />
                        <h3 className="text-xl font-semibold mt-4">
                            {useOnChain ? 'Step 2 of 2 — Depositing into Escrow' : 'Confirming Loan…'}
                        </h3>
                        <p className="text-gray-400 mt-2">
                            {useOnChain
                                ? 'Sign the deposit transaction. Your NFT will be held in the on-chain vault until the loan is settled.'
                                : 'Waiting for blockchain confirmation. Your funds will be disbursed shortly.'}
                        </p>
                        {useOnChain && (
                            <p className="mt-3 text-xs text-gray-500">Waiting for confirmation on Base Sepolia…</p>
                        )}
                    </div>
                );

            case 'success':
                return (
                    <div className="text-center">
                        <CheckCircleIcon className="h-16 w-16 text-green-400 mx-auto" />
                        <h3 className="text-xl font-semibold mt-4">Loan Active!</h3>
                        <p className="text-gray-400 mt-2">
                            {useOnChain
                                ? 'Your NFT is secured in the on-chain vault. The loan is live in your dashboard.'
                                : 'The loan amount has been sent to your wallet. Your new loan is now visible in your dashboard.'}
                        </p>
                        <button
                            onClick={onClose}
                            className="w-full mt-6 bg-brand-gold text-brand-dark font-bold py-2.5 px-6 rounded-lg hover:bg-brand-gold-light"
                        >
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
                        <button
                            onClick={() => setStep('initial')}
                            className="w-full mt-6 bg-brand-dark text-white font-bold py-2.5 px-6 rounded-lg hover:bg-brand-navy border border-yellow-900/40"
                        >
                            Try Again
                        </button>
                    </div>
                );
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-navy border border-yellow-900/40 rounded-2xl shadow-2xl p-8 w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">&times;</button>
                {renderContent()}
            </div>
        </div>
    );
};

export default TransactionModal;
