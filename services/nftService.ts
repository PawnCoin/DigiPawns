import { GoogleGenAI, Type } from "@google/genai";
import type { Nft } from '../types';

export const fetchNftsForWallet = async (walletAddress: string): Promise<Nft[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
            You are a blockchain data API simulator. For the wallet address "${walletAddress}", generate a realistic list of 8 NFTs they might own.
            The list should include a mix of well-known "blue chip" collections and some more niche, artistic, or gaming-related ones.
            For each NFT, provide:
            - A unique 'id' number.
            - The NFT's 'name' (e.g., "Bored Ape #1234").
            - The 'collection' name.
            - A plausible ERC-721 'contractAddress'.
            - A plausible 'tokenId'.
            - An 'imageUrl' using a placeholder service like 'https://picsum.photos/seed/UNIQUE_SEED/200'. Use a unique seed for each.
            - A realistic 'estimatedValue' in USD.
            Return the data as a valid JSON array of objects.
        `;

        const nftSchema = {
            type: Type.OBJECT,
            properties: {
                id: { type: Type.NUMBER },
                name: { type: Type.STRING },
                collection: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                estimatedValue: { type: Type.NUMBER },
                contractAddress: { type: Type.STRING },
                tokenId: { type: Type.STRING },
            },
            required: ["id", "name", "collection", "imageUrl", "estimatedValue", "contractAddress", "tokenId"]
        };
        
        const responseSchema = {
            type: Type.ARRAY,
            items: nftSchema
        };

        const result = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema,
                temperature: 0.9,
            },
        });

        const jsonText = result.text.trim();
        const nfts: Nft[] = JSON.parse(jsonText);
        
        return nfts;

    } catch (error) {
        console.error("Error fetching NFTs from Gemini:", error);
        // In a real app, you might want to return a default or cached list here
        throw new Error("Failed to fetch NFT portfolio. The AI service may be unavailable.");
    }
};
