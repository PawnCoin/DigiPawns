import React, { useState, useCallback, useEffect } from 'react';
import { NFT_MARKETPLACES } from '../constants';
import type { NftMarketplace, NftAppraisal, Loan, LoanTerms } from '../types';
import { getNftAppraisal } from '../services/geminiService';
import TransactionModal from './TransactionModal';
import { useAppContext } from '../contexts/AppContext';


const PawnForm: React.FC = () => {
    const { addLoan } = useAppContext();
    const [selectedMarket, setSelectedMarket] = useState<NftMarketplace>(NFT_MARKETPLACES[0]);
    const [contractAddress, setContractAddress] = useState<string>('');
    const [tokenId, setTokenId] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [appraisalResult, setAppraisalResult] = useState<NftAppraisal | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [nftDetailsForLoan, setNftDetailsForLoan] = useState<{name: string, collection: string}>({ name: 'Unnamed NFT', collection: 'Unknown Collection'});

    // State for advanced loan terms
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const [customInterestRate, setCustomInterestRate] = useState(5.0);
    const [customTermLength, setCustomTermLength] = useState(30);
    const [customRepayment, setCustomRepayment] = useState(0);

    useEffect(() => {
        if (appraisalResult) {
            const principal = appraisalResult.suggestedLoanUSD;
            const dailyRate = customInterestRate / 100 / 365;
            const repayment = principal * (1 + dailyRate * customTermLength);
            setCustomRepayment(repayment);
        }
    }, [appraisalResult, customInterestRate, customTermLength]);

    const handleAppraise = useCallback(async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contractAddress || !tokenId) {
            setError('Please provide both Contract Address and Token ID.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setAppraisalResult(null);

        try {
            const result = await getNftAppraisal({
                contractAddress,
                tokenId,
                market: selectedMarket.name,
            });
            setAppraisalResult(result);
            setNftDetailsForLoan({ name: `NFT #${tokenId}`, collection: `Collection ${contractAddress.substring(0,6)}...`});
            // Reset custom terms on new appraisal
            setIsAdvancedOpen(false);
            setCustomInterestRate(5.0);
            setCustomTermLength(30);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [contractAddress, tokenId, selectedMarket]);

    const handleAcceptOffer = () => {
        if(appraisalResult) {
            setIsModalOpen(true);
        }
    };
    
    const handleTransactionSuccess = (newLoan: Loan) => {
        addLoan(newLoan);
        setIsModalOpen(false);
        setAppraisalResult(null);
        setContractAddress('');
        setTokenId('');
    };

    const loanTerms: LoanTerms = {
        interestRate: customInterestRate,
        termLength: customTermLength,
        repaymentAmount: customRepayment,
    };

    return (
        <>
            <section id="appraise" className="py-20 sm:py-24">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-brand-gray p-8 rounded-2xl shadow-2xl border border-gray-700">
                        <h2 className="text-3xl font-bold text-center mb-2">Get an Instant Appraisal</h2>
                        <p className="text-center text-gray-400 mb-8">Select a marketplace and enter your NFT details to begin.</p>
                        
                        <form onSubmit={handleAppraise}>
                             <div className="mb-6">
                                <h3 className="font-semibold mb-3 text-center">1. Select Marketplace ("Plugin")</h3>
                                <div className="flex justify-center space-x-4">
                                    {NFT_MARKETPLACES.map((market) => (
                                        <button
                                            type="button"
                                            key={market.name}
                                            onClick={() => setSelectedMarket(market)}
                                            className={`p-4 bg-gray-900 rounded-lg border-2 transition-all duration-200 ${selectedMarket.name === market.name ? 'border-blue-500 shadow-blue-glow' : 'border-gray-700 opacity-60 hover:opacity-100'}`}
                                        >
                                            {market.logo}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label htmlFor="contractAddress" className="block text-sm font-medium text-gray-300 mb-1">Contract Address</label>
                                    <input type="text" id="contractAddress" value={contractAddress} onChange={(e) => setContractAddress(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0x..." />
                                </div>
                                <div>
                                    <label htmlFor="tokenId" className="block text-sm font-medium text-gray-300 mb-1">Token ID</label>
                                    <input type="text" id="tokenId" value={tokenId} onChange={(e) => setTokenId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1234" />
                                </div>
                            </div>
                            
                            <button type="submit" disabled={isLoading} className="w-full bg-brand-blue-light text-white font-bold py-3 px-6 rounded-lg text-lg hover:bg-blue-500 transition-all duration-300 shadow-blue-glow disabled:bg-gray-600 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center">
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        Appraising...
                                    </>
                                ) : "Appraise My NFT"}
                            </button>
                        </form>
                        
                        {error && <div className="mt-6 p-4 bg-red-900/50 text-red-300 border border-red-700 rounded-md text-center">{error}</div>}

                        {appraisalResult && (
                            <div className="mt-8 pt-6 border-t border-gray-700">
                                <h3 className="text-2xl font-bold text-center mb-4 text-blue-300">Appraisal Result</h3>
                                <div className="bg-gray-900/50 p-6 rounded-lg">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-sm text-gray-400">Estimated Value</p>
                                            <p className="text-3xl font-bold text-white">${appraisalResult.estimatedValueUSD.toLocaleString()}</p>
                                        </div>
                                        <div className="md:text-right">
                                            <p className="text-sm text-gray-400">Confidence</p>
                                            <p className="text-3xl font-bold text-white">{(appraisalResult.confidenceScore * 100).toFixed(0)}%</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 p-6 bg-gradient-to-r from-blue-600/20 to-brand-blue/20 rounded-lg text-center">
                                        <p className="text-lg text-gray-200">Suggested Loan Offer</p>
                                        <p className="text-4xl font-extrabold text-white my-2">${appraisalResult.suggestedLoanUSD.toLocaleString()}</p>
                                        <button onClick={handleAcceptOffer} className="mt-4 bg-white text-brand-blue font-bold py-2 px-8 rounded-lg hover:bg-gray-200 transition-colors">Accept Offer</button>
                                    </div>
                                </div>
                                
                                <div className="mt-4 pt-4 border-t border-gray-600">
                                    <div className="text-center">
                                        <label className="flex items-center justify-center space-x-2 cursor-pointer">
                                            <input type="checkbox" checked={isAdvancedOpen} onChange={() => setIsAdvancedOpen(!isAdvancedOpen)} className="form-checkbox h-5 w-5 text-blue-500 bg-gray-800 border-gray-600 rounded focus:ring-blue-500" />
                                            <span className="text-gray-300">Customize Loan Terms (Advanced)</span>
                                        </label>
                                    </div>

                                    {isAdvancedOpen && (
                                        <div className="mt-4 max-w-md mx-auto space-y-4 transition-all duration-300">
                                            <div>
                                                <div className="flex justify-between text-sm">
                                                    <label htmlFor="interestRate" className="text-gray-400">Interest Rate (APR):</label>
                                                    <span className="font-medium text-white">{customInterestRate.toFixed(1)}%</span>
                                                </div>
                                                <input id="interestRate" type="range" min="5" max="20" step="0.1" value={customInterestRate} onChange={e => setCustomInterestRate(parseFloat(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-sm">
                                                    <label htmlFor="termLength" className="text-gray-400">Term Length:</label>
                                                    <span className="font-medium text-white">{customTermLength} Days</span>
                                                </div>
                                                <input id="termLength" type="range" min="7" max="90" step="1" value={customTermLength} onChange={e => setCustomTermLength(parseInt(e.target.value))} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
                                            </div>
                                        </div>
                                    )}

                                    <h4 className="text-md font-semibold text-center mt-6 mb-3 text-gray-300">Provisional Loan Terms</h4>
                                    <div className="max-w-md mx-auto space-y-2 text-sm bg-gray-900/50 p-4 rounded-lg">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Loan Principal:</span>
                                            <span className="font-medium text-white">${appraisalResult.suggestedLoanUSD.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Interest Rate (APR):</span>
                                            <span className={`font-medium ${isAdvancedOpen ? 'text-blue-300' : 'text-white'}`}>{customInterestRate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Term Length:</span>
                                            <span className={`font-medium ${isAdvancedOpen ? 'text-blue-300' : 'text-white'}`}>{customTermLength} Days</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-gray-600 mt-2">
                                            <span className="text-gray-400 font-bold">Total Repayment:</span>
                                            <span className="font-bold text-lg text-blue-300">${customRepayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>
            {appraisalResult && (
                 <TransactionModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    appraisal={appraisalResult}
                    nftDetails={nftDetailsForLoan}
                    loanTerms={loanTerms}
                    onSuccess={handleTransactionSuccess}
                 />
            )}
        </>
    );
};

export default PawnForm;