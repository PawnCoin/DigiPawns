import React, { useState } from 'react';
import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { toast } from 'sonner';

interface EnsNameProps {
  /** The EVM address to resolve */
  address: string;
  /** How many chars to show at start when falling back to truncation (default 6) */
  prefixLen?: number;
  /** How many chars to show at end when falling back to truncation (default 4) */
  suffixLen?: number;
  /** Extra className forwarded to the wrapping element */
  className?: string;
  /**
   * When true, renders a small copy icon next to the name/address.
   * Clicking it copies the raw address to the clipboard and shows a toast.
   */
  copyable?: boolean;
}

/**
 * Resolves an EVM address to its ENS name via wagmi's useEnsName hook.
 * Falls back to a truncated hex address if no ENS name is registered.
 * Resolution happens in the background — no loading state is shown so the
 * UI stays stable and just upgrades once the name arrives.
 *
 * Pass `copyable` to render a small copy-to-clipboard icon next to the label.
 */
const EnsName: React.FC<EnsNameProps> = ({
  address,
  prefixLen = 6,
  suffixLen = 4,
  className,
  copyable = false,
}) => {
  const [copied, setCopied] = useState(false);

  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });

  const display = ensName
    ? ensName
    : address?.length >= prefixLen + suffixLen
    ? `${address.slice(0, prefixLen)}…${address.slice(-suffixLen)}`
    : address;

  /** Copy the displayed identity: ENS name when resolved, raw address otherwise. */
  const valueToCopy = ensName ?? address;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(valueToCopy);
      setCopied(true);
      toast.success(ensName ? 'ENS name copied!' : 'Address copied!');
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
          /* Checkmark */
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          /* Copy icon */
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </span>
  );
};

export default EnsName;
