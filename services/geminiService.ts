import { GoogleGenAI, Type } from "@google/genai";
import type { NftAppraisal, FeaturedNftCategory } from '../types';
import { fetchCollectionFloorPrice } from './nftService';

// Stable model IDs available on all API key tiers.
// gemini-2.0-flash: fast, capable, broadly accessible.
const APPRAISAL_MODEL = "gemini-2.0-flash";
const FEATURED_MODEL  = "gemini-2.0-flash";

function getAiClient(): GoogleGenAI {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("Appraisal service is not configured — GEMINI_API_KEY is missing. Contact the site administrator.");
    }
    return new GoogleGenAI({ apiKey });
}

function classifyGeminiError(error: unknown): string {
    if (error && typeof error === 'object') {
        const e = error as { status?: number; message?: string };
        if (e.status === 404) return "AI model not found — check the model name or API key access level.";
        if (e.status === 429) return "AI service rate limit reached. Please try again in a moment.";
        if (e.status === 403) return "AI service access denied — the API key may be invalid or expired.";
        if (e.message?.includes('API_KEY') || e.message?.includes('api key')) {
            return "AI service is not configured correctly. Contact the site administrator.";
        }
    }
    return "The AI service may be temporarily unavailable. Please try again.";
}

export const getNftAppraisal = async (
    nftInfo: { contractAddress: string; tokenId: string; market: string }
): Promise<NftAppraisal> => {
    try {
        const ai = getAiClient();

        const { contractAddress, tokenId, market } = nftInfo;

        // Fetch real collection floor price from Alchemy; proceed even if unavailable.
        let floorPriceLine = '';
        try {
            const floorData = await fetchCollectionFloorPrice(contractAddress);
            if (floorData) {
                floorPriceLine = `- Current collection floor price: ${floorData.floorPriceEth} ETH (source: ${floorData.source})`;
            }
        } catch (floorErr) {
            console.warn('Floor price lookup failed, proceeding without it:', floorErr);
        }

        const marketDataSection = floorPriceLine
            ? `\n            Real Market Data:\n            ${floorPriceLine}\n`
            : '';

        const prompt = `
            You are a professional NFT appraiser with deep knowledge of the digital asset market.
            Analyze the following NFT and provide a detailed valuation. The user has indicated the NFT is primarily traded on ${market}.

            NFT Details:
            - Contract Address: ${contractAddress}
            - Token ID: ${tokenId}
${marketDataSection}
            Based on the${floorPriceLine ? ' real market data above,' : ''} collection floor price, rarity of traits (if applicable), artist reputation, and recent sales volume, provide an estimated market value in USD, a confidence score from 0 to 1, a list of key value drivers, a suggested loan value (typically 40% of the estimated value), and a brief justification for your appraisal.${floorPriceLine ? ' Your estimated value should be anchored to the real floor price provided.' : ''}
        `;

        const responseSchema = {
            type: Type.OBJECT,
            properties: {
                estimatedValueUSD: {
                    type: Type.NUMBER,
                    description: "The estimated market value of the NFT in USD."
                },
                confidenceScore: {
                    type: Type.NUMBER,
                    description: "A score from 0.0 to 1.0 indicating your confidence in the appraisal."
                },
                valueDrivers: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.STRING
                    },
                    description: "A list of key factors influencing the NFT's value."
                },
                suggestedLoanUSD: {
                    type: Type.NUMBER,
                    description: "A suggested loan value in USD, typically 40% of the estimated value."
                },
                justification: {
                    type: Type.STRING,
                    description: "A brief text justification for the provided appraisal."
                }
            },
            required: ["estimatedValueUSD", "confidenceScore", "valueDrivers", "suggestedLoanUSD", "justification"]
        };

        const result = await ai.models.generateContent({
            model: APPRAISAL_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.2,
            },
        });

        const jsonText = result.text.trim();
        const appraisalData: NftAppraisal = JSON.parse(jsonText);

        return appraisalData;

    } catch (error) {
        console.error("Error getting NFT appraisal from Gemini:", error);
        throw new Error(`Failed to appraise NFT. ${classifyGeminiError(error)}`);
    }
};

export const getFeaturedNfts = async (): Promise<FeaturedNftCategory[]> => {
    try {
        const ai = getAiClient();
        const prompt = `
            You are a creative NFT market analyst for a high-end digital pawn shop called DigiPawns.
            Generate a list of 6 distinct and currently trending or interesting NFT categories.
            For each category, provide a creative name, a brief, exciting one-sentence description, and a list of exactly 5 example NFTs.
            Each NFT should have a creative name, a fictional but plausible collection name, and a realistic estimated value in USD.
            The values should be varied, from hundreds to millions of dollars.
            Format the entire output as a JSON array.
        `;

        const nftItemSchema = {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING },
                collection: { type: Type.STRING },
                estimatedValue: { type: Type.NUMBER },
            },
            required: ["name", "collection", "estimatedValue"]
        };

        const categorySchema = {
            type: Type.OBJECT,
            properties: {
                categoryName: { type: Type.STRING },
                description: { type: Type.STRING },
                nfts: {
                    type: Type.ARRAY,
                    items: nftItemSchema
                },
            },
            required: ["categoryName", "description", "nfts"]
        };
        
        const responseSchema = {
            type: Type.ARRAY,
            items: categorySchema
        };

        const result = await ai.models.generateContent({
            model: FEATURED_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
                temperature: 0.8,
            },
        });

        const jsonText = result.text.trim();
        const featuredData: FeaturedNftCategory[] = JSON.parse(jsonText);
        
        return featuredData;

    } catch (error) {
        console.error("Error getting featured NFTs from Gemini:", error);
        throw new Error(`Failed to load featured collections. ${classifyGeminiError(error)}`);
    }
}
