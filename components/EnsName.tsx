import React from 'react';
import { useEnsName } from 'wagmi';
import { mainnet } from 'wagmi/chains';

interface EnsNameProps {
  /** The EVM address to resolve */
  address: string;
  /** How many chars to show at start when falling back to truncation (default 6) */
  prefixLen?: number;
  /** How many chars to show at end when falling back to truncation (default 4) */
  suffixLen?: number;
  /** Extra className forwarded to the wrapping span */
  className?: string;
}

/**
 * Resolves an EVM address to its ENS name via wagmi's useEnsName hook.
 * Falls back to a truncated hex address if no ENS name is registered.
 * Resolution happens in the background — no loading state is shown so the
 * UI stays stable and just upgrades once the name arrives.
 */
const EnsName: React.FC<EnsNameProps> = ({
  address,
  prefixLen = 6,
  suffixLen = 4,
  className,
}) => {
  const { data: ensName } = useEnsName({
    address: address as `0x${string}`,
    chainId: mainnet.id,
  });

  const display = ensName
    ? ensName
    : address?.length >= prefixLen + suffixLen
    ? `${address.slice(0, prefixLen)}…${address.slice(-suffixLen)}`
    : address;

  return <span className={className}>{display}</span>;
};

export default EnsName;
