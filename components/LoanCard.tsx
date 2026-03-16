import React, { useState } from 'react';
import type { Loan } from '../types';
import { differenceInDays, format } from 'date-fns';
import RepayModal from './RepayModal';
import LiquidateModal from './LiquidateModal';
import { motion } from 'framer-motion';

interface LoanCardProps {
  loan: Loan;
  repayLoan: (loanId: string) => void;
  liquidateLoan: (loanId: string) => void;
}

const LoanCard: React.FC<LoanCardProps> = ({ loan, repayLoan, liquidateLoan }) => {
  const [isRepayModalOpen, setIsRepayModalOpen] = useState(false);
  const [isLiquidateModalOpen, setIsLiquidateModalOpen] = useState(false);

  const daysRemaining = differenceInDays(new Date(loan.dueDate), new Date());
  const totalTerm = 30; // Assuming a 30 day term for progress bar
  const progress = loan.status === 'Active' ? Math.max(0, (totalTerm - daysRemaining) / totalTerm * 100) : 100;

  const statusStyles = {
    Active: 'bg-blue-500/20 text-blue-300 border-blue-500',
    Repaid: 'bg-green-500/20 text-green-300 border-green-500',
    Defaulted: 'bg-red-500/20 text-red-300 border-red-500',
    Liquidated: 'bg-gray-500/20 text-gray-300 border-gray-500',
  };

  const statusClass = statusStyles[loan.status] || 'bg-gray-500/20 text-gray-300';
  const borderClass = loan.status === 'Defaulted' ? 'border-red-700/60 hover:border-red-500/80' : 'border-gray-700 hover:border-blue-500';

  const handleRepaySuccess = () => {
    repayLoan(loan.id);
    setIsRepayModalOpen(false);
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
        className={`bg-brand-gray border rounded-xl overflow-hidden shadow-lg transition-all duration-300 ${borderClass} hover:shadow-blue-glow`}
      >
        <div className="w-full h-48 bg-gray-800 animate-pulse">
          {/* In a real app, this would be: <img src={loan.nft.imageUrl} alt={loan.nft.name} className="w-full h-full object-cover" /> */}
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
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
          
          {loan.status === 'Repaid' && (
             <div className="mt-6 text-center text-sm text-gray-400">
               Loan repaid on {format(new Date(loan.dueDate), 'MMM d, yyyy')}
             </div>
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

          {loan.status === 'Active' && (
            <button 
              onClick={() => setIsRepayModalOpen(true)}
              className="w-full mt-6 bg-brand-blue-light text-white font-bold py-2.5 px-6 rounded-lg hover:bg-blue-500 transition-all duration-300 shadow-md">
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