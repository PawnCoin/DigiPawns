import React from 'react';
import { useAppContext } from '../contexts/AppContext';
import LoanCard from './LoanCard';
import LoanAnalytics from './LoanAnalytics';

const LoanView: React.FC = () => {
    const { loans, navigate, repayLoan, liquidateLoan } = useAppContext();
    
    const visibleLoans = loans.filter(loan => loan.status !== 'Liquidated');

    const activeLoans = visibleLoans.filter(loan => loan.status === 'Active');
    const repaidLoans = visibleLoans.filter(loan => loan.status === 'Repaid');
    const defaultedLoans = visibleLoans.filter(loan => loan.status === 'Defaulted');

    const handleAppraiseClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        navigate('/');
        setTimeout(() => {
            document.getElementById('appraise')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    return (
        <div>
            <LoanAnalytics loans={visibleLoans} />

            <div>
                <h2 className="text-2xl font-semibold mb-6">Active Loans ({activeLoans.length})</h2>
                {activeLoans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {activeLoans.map(loan => <LoanCard key={loan.id} loan={loan} repayLoan={repayLoan} liquidateLoan={liquidateLoan} />)}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-brand-navy rounded-lg border border-yellow-900/30">
                        <p className="text-gray-400">You have no active loans.</p>
                        <button onClick={handleAppraiseClick} className="text-brand-gold hover:underline mt-2 inline-block">Appraise an NFT to get started</button>
                    </div>
                )}
            </div>

            <div className="mt-16">
                <h2 className="text-2xl font-semibold mb-6">Repaid Loans ({repaidLoans.length})</h2>
                {repaidLoans.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {repaidLoans.map(loan => <LoanCard key={loan.id} loan={loan} repayLoan={repayLoan} liquidateLoan={liquidateLoan} />)}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-brand-navy rounded-lg border border-yellow-900/30">
                        <p className="text-gray-400">You have no repaid loan history.</p>
                    </div>
                )}
            </div>

             {defaultedLoans.length > 0 && (
                <div className="mt-16">
                    <h2 className="text-2xl font-semibold mb-6 text-red-400">Defaulted Loans ({defaultedLoans.length})</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {defaultedLoans.map(loan => <LoanCard key={loan.id} loan={loan} repayLoan={repayLoan} liquidateLoan={liquidateLoan} />)}
                    </div>
                </div>
             )}
        </div>
    );
};

export default LoanView;
