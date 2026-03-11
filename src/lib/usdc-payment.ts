// USDC Payment utilities for LandPulse
// Supports Solana testnet for development

// USDC Token Mint Addresses
export const USDC_MINT = {
  mainnet: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  devnet: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU', // Testnet USDC
};

// Get USDC mint based on environment
export function getUsdcMint(): string {
  return USDC_MINT.devnet; // Always use devnet for testing
}

// Decimals for USDC
export const USDC_DECIMALS = 6;

// Convert USDC amount to lamports (smallest unit)
export function usdcToLamports(usdcAmount: number): number {
  return Math.floor(usdcAmount * Math.pow(10, USDC_DECIMALS));
}

// Convert lamports to USDC
export function lamportsToUsdc(lamports: number): number {
  return lamports / Math.pow(10, USDC_DECIMALS);
}

// Create a USDC transfer transaction
// This is a simplified version - in production you'd use @solana/web3.js
export interface UsdcPaymentRequest {
  amount: number; // in USDC
  recipientWallet: string;
  senderWallet: string;
  packageIndex: number;
}

// Recipient wallet (treasury) - replace with your treasury wallet
export const TREASURY_WALLET = 'ABA7EawmxeMPcA97urfu6a54FHsd6BhAKQtKERKPFki5'; // Your wallet for testing

// Simulate USDC transfer for development
// In production, this would create a real Solana transaction
export async function createUsdcTransferTransaction(
  amount: number,
  recipientWallet: string,
  senderWallet: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    // Check if Phantom is available
    if (typeof window === 'undefined') {
      return { success: false, error: 'Window not available' };
    }

    const solana = (window as unknown as { 
      solana?: { 
        isPhantom?: boolean;
        publicKey?: { toString(): string };
        signTransaction?: (transaction: unknown) => Promise<unknown>;
        signAndSendTransaction?: (transaction: unknown) => Promise<{ signature: string }>;
      } 
    }).solana;

    if (!solana?.isPhantom) {
      return { success: false, error: 'Phantom wallet not detected' };
    }

    // For now, simulate the transaction
    // In production, you would:
    // 1. Create a SPL token transfer instruction
    // 2. Build the transaction
    // 3. Sign and send via Phantom
    
    console.log('[USDC Payment] Simulating transfer:', {
      amount,
      from: senderWallet,
      to: recipientWallet,
    });

    // Simulate a delay for transaction
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate a fake signature for testing
    const fakeSignature = 'sim_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

    return { success: true, signature: fakeSignature };
  } catch (error) {
    console.error('[USDC Payment] Error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Verify a USDC payment on the backend
// In production, this would check the blockchain
export async function verifyUsdcPayment(
  signature: string,
  expectedAmount: number,
  senderWallet: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // In production, you would:
    // 1. Use @solana/web3.js to fetch the transaction
    // 2. Verify it's a valid USDC transfer
    // 3. Check amount, sender, recipient
    
    // For testing, accept all simulated transactions
    if (signature.startsWith('sim_')) {
      return { success: true };
    }

    return { success: false, error: 'Invalid signature format' };
  } catch (error) {
    console.error('[USDC Payment] Verification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
