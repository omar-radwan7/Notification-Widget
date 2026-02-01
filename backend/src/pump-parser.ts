import { PublicKey } from '@solana/web3.js';

// pump.fun program ID
export const PUMP_FUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';

// Buy instruction discriminator (first 8 bytes of sha256("global:buy"))
const BUY_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);

export interface BuyEvent {
  tokenAddress: string;
  buyer: string;
  tokenAmount: string;
  solAmount: string;
  timestamp: number;
  signature: string;
}

/**
 * Check if instruction data represents a buy instruction
 */
export function isBuyInstruction(data: Buffer): boolean {
  if (data.length < 8) return false;
  return data.subarray(0, 8).equals(BUY_DISCRIMINATOR);
}

/**
 * Parse buy event from transaction
 */
export function parseBuyEvent(
  signature: string,
  accounts: string[],
  data: Buffer,
  timestamp: number
): BuyEvent | null {
  try {
    if (!isBuyInstruction(data)) {
      return null;
    }

    // pump.fun buy instruction account layout:
    // 0: global state
    // 1: fee recipient
    // 2: mint (token address)
    // 3: bonding curve
    // 4: associated bonding curve
    // 5: associated user (buyer's token account)
    // 6: user (buyer)
    // 7: system program
    // 8: token program
    // 9: rent
    // 10: event authority
    // 11: program

    if (accounts.length < 7) {
      return null;
    }

    const tokenAddress = accounts[2];
    const buyer = accounts[6];

    // Parse buy instruction data (after 8-byte discriminator):
    // - token_amount: u64 (8 bytes)
    // - max_sol_cost: u64 (8 bytes)
    const tokenAmount = data.readBigUInt64LE(8);
    const solAmount = data.readBigUInt64LE(16);

    return {
      tokenAddress,
      buyer,
      tokenAmount: formatTokenAmount(tokenAmount),
      solAmount: formatSolAmount(solAmount),
      timestamp,
      signature,
    };
  } catch (error) {
    console.error('Error parsing buy event:', error);
    return null;
  }
}

/**
 * Format token amount (assuming 6 decimals for pump.fun tokens)
 */
function formatTokenAmount(amount: bigint): string {
  const decimals = 6;
  const divisor = BigInt(10 ** decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
}

/**
 * Format SOL amount (9 decimals)
 */
function formatSolAmount(lamports: bigint): string {
  const decimals = 9;
  const divisor = BigInt(10 ** decimals);
  const whole = lamports / divisor;
  const fraction = lamports % divisor;
  return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
}

/**
 * Truncate address for display
 */
export function truncateAddress(address: string): string {
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
