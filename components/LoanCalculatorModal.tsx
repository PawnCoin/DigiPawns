import React, { useState, useEffect } from 'react';
import { CalculatorIcon } from './IconComponents';

interface LoanCalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const LoanCalculatorModal: React.FC<LoanCalculatorModalProps> = ({ isOpen, onClose }) => {
    const [amount, setAmount] = useState(10000);
    const [rate, setRate] = useState(8.5);
    const [term, setTerm] = useState(30);
    
    const [totalRepayment, setTotalRepayment] = useState(0);
    const [totalInterest, setTotalInterest] = useState(0);

    useEffect(() => {
        if (amount > 0 && rate > 0 && term > 0) {
            const dailyRate = rate / 100 / 365;
            const interest = amount * dailyRate * term;
            const repayment = amount + interest;
            setTotalInterest(interest);
            setTotalRepayment(repayment);
        } else {
            setTotalInterest(0);
            setTotalRepayment(0);
        }
    }, [amount, rate, term]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-brand-gray border border-gray-700 rounded-2xl shadow-2xl p-8 w-full max-w-lg relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white text-2xl">&times;</button>
                
                <div className="flex items-center space-x-4 mb-6">
                     <div className="flex-shrink-0 flex h-14 w-14 items-center justify-center rounded-full bg-blue-500/20">
                        <CalculatorIcon className="h-7 w-7 text-blue-300" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-semibold">Loan Repayment Calculator</h3>
                        <p className="text-gray-400">Estimate your repayment for any loan scenario.</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Loan Amount */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="loanAmount" className="font-medium text-gray-300">Loan Amount ($)</label>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(Number(e.target.value))}
                                className="w-32 bg-gray-900/50 border border-gray-600 rounded-md py-1 px-2 text-right font-semibold text-white"
                            />
                        </div>
                        <input id="loanAmount" type="range" min="100" max="100000" step="100" value={amount} onChange={e => setAmount(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>

                    {/* Interest Rate */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="interestRate" className="font-medium text-gray-300">Interest Rate (APR %)</label>
                            <input
                                type="number"
                                value={rate}
                                onChange={e => setRate(Number(e.target.value))}
                                className="w-32 bg-gray-900/50 border border-gray-600 rounded-md py-1 px-2 text-right font-semibold text-white"
                            />
                        </div>
                        <input id="interestRate" type="range" min="1" max="25" step="0.1" value={rate} onChange={e => setRate(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>

                    {/* Term Length */}
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label htmlFor="termLength" className="font-medium text-gray-300">Term Length (Days)</label>
                            <input
                                type="number"
                                value={term}
                                onChange={e => setTerm(Number(e.target.value))}
                                className="w-32 bg-gray-900/50 border border-gray-600 rounded-md py-1 px-2 text-right font-semibold text-white"
                            />
                        </div>
                        <input id="termLength" type="range" min="7" max="180" step="1" value={term} onChange={e => setTerm(Number(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-700 space-y-3 bg-gray-900/30 p-4 rounded-lg">
                    <div className="flex justify-between text-lg">
                        <span className="text-gray-400">Total Interest:</span>
                        <span className="font-medium text-white">${totalInterest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                     <div className="flex justify-between text-xl">
                        <span className="text-gray-300 font-bold">Total Repayment:</span>
                        <span className="font-bold text-2xl text-blue-300">${totalRepayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoanCalculatorModal;