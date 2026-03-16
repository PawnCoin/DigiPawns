import { GoogleGenAI, Type } from "@google/genai";
import type { NftAppraisal, FeaturedNftCategory } from '../types';

export const getNftAppraisal = async (
    nftInfo: { contractAddress: string; tokenId: string; market: string }
): Promise<NftAppraisal> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        const { contractAddress, tokenId, market } = nftInfo;

        const prompt = `
            You are a professional NFT appraiser with deep knowledge of the digital asset market.
            Analyze the following NFT and provide a detailed valuation. The user has indicated the NFT is primarily traded on ${market}.

            NFT Details:
            - Contract Address: ${contractAddress}
            - Token ID: ${tokenId}

            Based on simulated market data, collection floor price, rarity of traits (if applicable), artist reputation, and recent sales volume, provide an estimated market value in USD, a confidence score from 0 to 1, a list of key value drivers, a suggested loan value (typically 40% of the estimated value), and a brief justification for your appraisal.
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
            model: "gemini-2.5-flash",
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
        throw new Error("Failed to appraise NFT. The AI service may be temporarily unavailable.");
    }
};

export const getFeaturedNfts = async (): Promise<FeaturedNftCategory[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
            model: "gemini-2.5-pro",
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
        throw new Error("Failed to load featured collections. The AI service may be encountering issues.");
    }
}