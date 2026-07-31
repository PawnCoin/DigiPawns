import React, { useState, useEffect } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';

interface SnsNameProps {
  /** The Solana base58 address to resolve */
  address: string;
  /** How many chars to show at start when falling back to truncation (default 6) */
  prefixLen?: number;
  /** How many chars to show at end when falling back to truncation (default 4) */
  suffixLen?: number;
  /** Extra className forwarded to the wrapping element */
  className?: string;
  /**
   * When true, renders a small copy icon next to the name/address.
   * Clicking it copies the SNS name (or raw address) to the clipboard.
   */
  copyable?: boolean;
}

/**
 * Resolves a Solana wallet address to its primary SNS (.sol) domain via
 * @bonfida/spl-name-service's getFavoriteDomain.
 *
 * - getFavoriteDomain(connection, walletAddressString) returns
 *   { domain: PublicKey, reverse: string, stale: boolean } where `reverse` is
 *   the human-readable label without the ".sol" suffix.
 * - Falls back to a truncated base58 address when no SNS name is registered or
 *   the domain account is stale/owned by someone else.
 * - Resolution is silently backgrounded — the UI stays stable and upgrades once
 *   the name arrives, mirroring EnsName for EVM addresses.
 *
 * Pass `copyable` to render a small copy-to-clipboard icon next to the label.
 */
const SnsName: React.FC<SnsNameProps> = ({
  address,
  prefixLen = 6,
  suffixLen = 4,
  className,
  copyable = false,
}) => {
  const { connection } = useConnection();
  const [snsName, setSnsName] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    // Reset immediately so we never show a previous wallet's name while the new
    // lookup is in-flight.
    setSnsName(null);

    (async () => {
      try {
        // Dynamic import avoids static ES-module issues (same pattern as spl-token)
        const { getFavoriteDomain } = await import('@bonfida/spl-name-service');
        // getFavoriteDomain expects a PublicKey (not a string); passing a string
        // causes the internal owner.equals() stale-check to throw at runtime.
        const ownerKey = new PublicKey(address);
        const { reverse, stale } = await getFavoriteDomain(connection, ownerKey);
        if (!cancelled) {
          // Only show the SNS name when it is both present and owned by this wallet.
          setSnsName(reverse && !stale ? `${reverse}.sol` : null);
        }
      } catch {
        // No favourite/primary SNS domain — stay on truncated fallback.
        if (!cancelled) setSnsName(null);
      }
    })();

    return () => { cancelled = true; };
  }, [address, connection]);

  const truncated =
    address?.length >= prefixLen + suffixLen
      ? `${address.slice(0, prefixLen)}…${address.slice(-suffixLen)}`
      : address;

  const display = snsName ?? truncated;
  const valueToCopy = snsName ?? address;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopied(true);
      toast.success(snsName ? 'SNS name copied!' : 'Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!copyable) {
    return <span className={className}>{display}</span>;
  }

  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <span>{display}</span>
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy address'}
        className="opacity-40 hover:opacity-100 transition-opacity flex-shrink-0 leading-none"
      >
        {copied ? (
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </span>
  );
};

export default SnsName;
