import { useState, useEffect, useCallback } from 'react';
import { fetchTokenPrices, invalidatePriceCache, type TokenPrices } from '../services/priceService';

const REFRESH_INTERVAL_MS = 60_000;

const NULL_PRICES: TokenPrices = { eth: null, matic: null, sol: null, dig: null, pc: null };

export function usePrices() {
    const [prices, setPrices]     = useState<TokenPrices>(NULL_PRICES);
    const [isLoading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    const load = useCallback(async (force = false) => {
        if (force) invalidatePriceCache();
        try {
            const p = await fetchTokenPrices();
            setPrices(p);
            setLastUpdated(new Date());
        } catch {
            // prices remain as-is
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
        const id = setInterval(() => load(), REFRESH_INTERVAL_MS);
        return () => clearInterval(id);
    }, [load]);

    const refresh = useCallback(() => load(true), [load]);

    return { prices, isLoading, lastUpdated, refresh };
}
