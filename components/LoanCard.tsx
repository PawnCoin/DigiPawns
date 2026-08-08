import React, { useState } from 'react';
import type { Loan } from '../types';
import { differenceInDays, format } from 'date-fns';
import RepayModal from './RepayModal';
import LiquidateModal from './LiquidateModal';
import { motion } from 'framer-motion';

interface LoanCardProps {
  loan: Loan;
  repayLoan: (loanId: string, paymentInfo?: { txHash?: string; token?: string; discountPct?: number }) => void;
  liquidateLoan: (loanId: string) => void;
}

const LoanCard: React.FC<LoanCardProps> = ({ loan, repayLoan, liquidateLoan }) => {
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [isLiquidateModalOpen, setIsLiquidateModalOpen] = useState(false);

  const daysRemaining = differenceInDays(new Date(loan.dueDate), new Date());
  const totalTerm = 30;
  const progress = loan.status === 'Active' ? Math.max(0, (totalTerm - daysRemaining) / totalTerm * 100) : 100;

  const statusStyles = {
    Active: 'bg-yellow-500/20 text-yellow-300 border-yellow-500',
    Repaid: 'bg-green-500/20 text-green-300 border-green-500',
    Defaulted: 'bg-red-500/20 text-red-300 border-red-500',
    Liquidated: 'bg-gray-500/20 text-gray-300 border-gray-500',
  };

  const statusClass = statusStyles[loan.status] || 'bg-gray-500/20 text-gray-300';
  const borderClass = loan.status === 'Defaulted' ? 'border-red-700/60 hover:border-red-500/80' : 'border-yellow-900/40 hover:border-brand-gold/60';

  const handleRepaySuccess = async (paymentInfo?: { txHash?: string; token: string; discountPct: number }) => {
    // Awaited so RepayModal can detect Firestore failures and show a recovery screen.
    await repayLoan(loan.id, paymentInfo);
  };

  const handleLiquidateSuccess = () => {
    liquidateLoan(loan.id);
    setIsLiquidateModalOpen(false);
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ y: -5 }}
        transition={{ duration: 0.2 }}
        className={`bg-brand-navy border rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${borderClass} hover:shadow-gold-glow`}
      >
        <div className="w-full h-48 bg-brand-dark/60 animate-pulse">
        </div>
        <div className="p-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-gray-400">{loan.nft.collection}</p>
              <h3 className="font-bold text-xl text-white truncate">{loan.nft.name}</h3>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${statusClass}`}>
              {loan.status}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6 text-sm">
            <div>
              <p className="text-gray-400">Principal</p>
              <p className="font-bold text-lg text-white">${loan.principal.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-400">Final Amount</p>
              <p className="font-bold text-lg text-white">${loan.repaymentAmount.toLocaleString()}</p>
            </div>
          </div>

          {loan.status === 'Active' && (
            <div className="mt-6">
              <div className="flex justify-between items-center text-xs text-gray-400 mb-1">
                <span>Due In: {daysRemaining >= 0 ? `${daysRemaining} days` : 'Overdue'}</span>
                <span>{format(new Date(loan.dueDate), 'MMM d, yyyy')}</span>
              </div>
              <div className="w-full bg-brand-dark rounded-full h-2.5">
                <div className="bg-brand-gold h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
          
          {loan.status === 'Repaid' && (
             <div className="mt-6 text-center text-sm text-gray-400">
               Loan repaid on {format(new Date(loan.dueDate), 'MMM d, yyyy')}
             </div>
          )}

          {/* Repayment transaction link */}
          {loan.status === 'Repaid' && loan.repaymentTxHash && (
            <a
              href={`https://basescan.org/tx/${loan.repaymentTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-light underline underline-offset-2 transition-colors"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full inline-block flex-shrink-0" />
              View repayment on Basescan ↗
            </a>
          )}

           {loan.status === 'Defaulted' && (
             <div className="mt-6 text-center text-sm text-red-300/80">
               Loan defaulted on {format(new Date(loan.dueDate), 'MMM d, yyyy')}
             </div>
          )}
          
          {loan.status === 'Liquidated' && (
             <div className="mt-6 text-center text-sm text-gray-500">
               Collateral liquidated. Loan closed.
             </div>
          )}

          {/* Deposit transaction link */}
          {loan.depositTxHash && (
            <a
              href={`https://basescan.org/tx/${loan.depositTxHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-1.5 text-xs text-brand-gold hover:text-brand-gold-light underline underline-offset-2 transition-colors"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full inline-block flex-shrink-0" />
              View deposit on Basescan ↗
            </a>
          )}

          {/* NFT Transfer Status */}
          {loan.nftTransferStatus && (
            <div className={`mt-4 px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
              loan.nftTransferStatus === 'awaiting_transfer' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-500/30' :
              loan.nftTransferStatus === 'received'          ? 'bg-blue-400/10 text-blue-400 border-blue-500/30' :
              loan.nftTransferStatus === 'active'            ? 'bg-green-400/10 text-green-400 border-green-500/30' :
              loan.nftTransferStatus === 'returned'          ? 'bg-purple-400/10 text-purple-400 border-purple-500/30' :
                                                               'bg-red-400/10 text-red-400 border-red-500/30'
            }`}>
              {loan.nftTransferStatus === 'awaiting_transfer' && '⏳ Awaiting NFT Transfer'}
              {loan.nftTransferStatus === 'received'          && '📬 NFT Received by DigiPawns'}
              {loan.nftTransferStatus === 'active'            && '✅ NFT Held — Loan Active'}
              {loan.nftTransferStatus === 'returned'          && '🔄 NFT Being Returned'}
              {loan.nftTransferStatus === 'liquidated'        && '🔴 NFT Liquidated'}
            </div>
          )}

          {/* Awaiting transfer instructions */}
          {loan.nftTransferStatus === 'awaiting_transfer' && loan.status === 'Active' && (
            <div className="mt-3 p-3 bg-brand-dark/60 rounded-lg border border-yellow-900/30 text-xs text-gray-400 space-y-1">
              <p className="font-semibold text-yellow-300">📋 Next step: Transfer your NFT</p>
              <p>Send your NFT to our vault address. Your loan activates once we confirm receipt.</p>
              {loan.contractAddress && <p className="font-mono text-gray-500">Contract: {loan.contractAddress.slice(0,12)}…</p>}
            </div>
          )}

          {loan.status === 'Active' && (
            <button 
              onClick={() => setIsRepayModalOpen(true)}
              className="w-full mt-4 bg-brand-gold text-brand-dark font-bold py-2.5 px-6 rounded-lg hover:bg-brand-gold-light transition-all duration-300 shadow-md">
              Repay Loan
            </button>
          )}

          {loan.status === 'Defaulted' && (
             <button 
              onClick={() => setIsLiquidateModalOpen(true)}
              className="w-full mt-6 bg-red-600/80 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-red-500 transition-all duration-300 shadow-md shadow-red-500/20">
              Acknowledge & Liquidate
            </button>
          )}
        </div>
      </motion.div>

      {loan.status === 'Active' && (
          <RepayModal 
            isOpen={isRepayModalOpen}
            onClose={() => setIsRepayModalOpen(false)}
            loan={loan}
            onSuccess={handleRepaySuccess}
          />
      )}
      {loan.status === 'Defaulted' && (
          <LiquidateModal
            isOpen={isLiquidateModalOpen}
            onClose={() => setIsLiquidateModalOpen(false)}
            loan={loan}
            onSuccess={handleLiquidateSuccess}
          />
      )}
    </>
  );
};

export default LoanCard;
