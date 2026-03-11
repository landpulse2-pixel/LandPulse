// Phantom USDC Payment Integration for LandPulse
// Supports Solana devnet/testnet for testing

import { Connection, PublicKey, VersionedTransaction, TransactionMessage } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';

// ============================================
// 🔧 MODE TEST - Mettre à false pour production
// ============================================
export const TEST_MODE = true;

// USDC Token Mint on Devnet
export const USDC_MINT_DEVNET = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

// Treasury wallet (where USDC payments go)
export const TREASURY_WALLET = new PublicKey('ABA7EawmxeMPcA97urfu6a54FHsd6BhAKQtKERKPFki5');

// Solana RPC endpoint
const RPC_ENDPOINT = 'https://api.devnet.solana.com';

// USDC decimals
export const USDC_DECIMALS = 6;

// Get connection to Solana
export function getConnection(): Connection {
  return new Connection(RPC_ENDPOINT, 'confirmed');
}

// Convert USDC to smallest unit (micro USDC)
export function usdcToMicroUsdc(usdcAmount: number): number {
  return Math.floor(usdcAmount * Math.pow(10, USDC_DECIMALS));
}

// Convert micro USDC to USDC
export function microUsdcToUsdc(microUsdc: number): number {
  return microUsdc / Math.pow(10, USDC_DECIMALS);
}

// Check if Phantom is available
export function isPhantomAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  const solana = (window as any).solana;
  return solana?.isPhantom === true;
}

// Get Phantom provider
export function getPhantomProvider(): any {
  if (typeof window === 'undefined') return null;
  return (window as any).solana;
}

// Get USDC balance for a wallet
export async function getUsdcBalance(walletAddress: string): Promise<number> {
  // In test mode, return a fake balance
  if (TEST_MODE) {
    console.log('[TEST MODE] Returning fake USDC balance: 100 USDC');
    return 100;
  }

  try {
    const connection = getConnection();
    const walletPubkey = new PublicKey(walletAddress);
    
    // Get USDC token account
    const usdcTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      walletPubkey
    );
    
    try {
      const account = await getAccount(connection, usdcTokenAccount);
      const balance = Number(account.amount) / Math.pow(10, USDC_DECIMALS);
      return balance;
    } catch {
      // Token account doesn't exist
      return 0;
    }
  } catch (error) {
    console.error('Error getting USDC balance:', error);
    return 0;
  }
}

// Send USDC via Phantom - This will open Phantom wallet for signature
export async function sendUsdcViaPhantom(
  usdcAmount: number,
  recipientWallet: string
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const provider = getPhantomProvider();
    
    console.log('[USDC Payment] Starting payment flow...');
    console.log('[USDC Payment] TEST MODE:', TEST_MODE);
    console.log('[USDC Payment] Provider:', provider ? 'found' : 'not found');
    console.log('[USDC Payment] Is Phantom:', provider?.isPhantom);
    console.log('[USDC Payment] Public Key:', provider?.publicKey?.toString());
    
    if (!provider?.isPhantom) {
      return { success: false, error: 'Phantom wallet not detected. Please install Phantom extension.' };
    }
    
    if (!provider.publicKey) {
      return { success: false, error: 'Wallet not connected. Please connect your Phantom wallet first.' };
    }

    // ============================================
    // 🧪 TEST MODE - Simule la transaction
    // ============================================
    if (TEST_MODE) {
      console.log('[TEST MODE] Simulating USDC payment...');
      
      // Simulate a delay for UX
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate a fake signature
      const fakeSignature = 'TEST_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 15);
      
      console.log('[TEST MODE] Payment simulated successfully!');
      console.log('[TEST MODE] Fake signature:', fakeSignature);
      
      return { success: true, signature: fakeSignature };
    }

    // ============================================
    // 🚀 PRODUCTION MODE - Vraie transaction blockchain
    // ============================================
    const connection = getConnection();
    const fromPubkey = provider.publicKey;
    const toPubkey = new PublicKey(recipientWallet);
    const microUsdcAmount = usdcToMicroUsdc(usdcAmount);
    
    console.log('[USDC Payment] Amount:', usdcAmount, 'USDC (', microUsdcAmount, 'micro USDC)');
    console.log('[USDC Payment] From:', fromPubkey.toString());
    console.log('[USDC Payment] To:', recipientWallet);
    
    // Get token accounts
    const fromTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      fromPubkey
    );
    
    const toTokenAccount = await getAssociatedTokenAddress(
      USDC_MINT_DEVNET,
      toPubkey
    );
    
    console.log('[USDC Payment] From token account:', fromTokenAccount.toString());
    console.log('[USDC Payment] To token account:', toTokenAccount.toString());
    
    // Check if sender has USDC
    try {
      const fromAccount = await getAccount(connection, fromTokenAccount);
      const balance = Number(fromAccount.amount) / Math.pow(10, USDC_DECIMALS);
      console.log('[USDC Payment] Sender USDC balance:', balance);
      
      if (balance < usdcAmount) {
        return { 
          success: false, 
          error: `Insufficient USDC balance. You have ${balance.toFixed(2)} USDC but need ${usdcAmount} USDC.` 
        };
      }
    } catch (e) {
      console.error('[USDC Payment] Error checking balance:', e);
      return { success: false, error: 'No USDC token account found. Please get some USDC on devnet first.' };
    }
    
    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPubkey,
      microUsdcAmount,
      [],
      TOKEN_PROGRAM_ID
    );
    
    console.log('[USDC Payment] Transfer instruction created');
    
    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    console.log('[USDC Payment] Got blockhash:', blockhash);
    
    // Create transaction message
    const message = new TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash: blockhash,
      instructions: [transferInstruction],
    }).compileToV0Message();
    
    // Create versioned transaction
    const transaction = new VersionedTransaction(message);
    
    console.log('[USDC Payment] Transaction created, requesting signature from Phantom...');
    console.log('[USDC Payment] This should open Phantom wallet popup!');
    
    // Sign and send transaction via Phantom
    // This WILL open the Phantom popup for user approval
    const { signature } = await provider.signAndSendTransaction(transaction);
    
    console.log('[USDC Payment] Transaction signed and sent!');
    console.log('[USDC Payment] Signature:', signature);
    
    // Wait for confirmation
    console.log('[USDC Payment] Waiting for confirmation...');
    const confirmation = await connection.confirmTransaction({
      blockhash,
      lastValidBlockHeight,
      signature
    }, 'confirmed');
    
    if (confirmation.value.err) {
      console.error('[USDC Payment] Transaction failed:', confirmation.value.err);
      return { 
        success: false, 
        error: `Transaction failed: ${JSON.stringify(confirmation.value.err)}` 
      };
    }
    
    console.log('[USDC Payment] Transaction confirmed!');
    
    return { success: true, signature };
    
  } catch (error: any) {
    console.error('[USDC Payment] Error:', error);
    
    // Handle specific Phantom errors
    if (error.message?.includes('User rejected') || error.code === 4001) {
      return { success: false, error: 'Transaction rejected by user' };
    }
    
    if (error.message?.includes('not connected')) {
      return { success: false, error: 'Phantom wallet not connected. Please connect and try again.' };
    }
    
    return { 
      success: false, 
      error: error.message || 'Unknown error occurred during transaction' 
    };
  }
}

// Verify a USDC payment on the blockchain
export async function verifyUsdcPaymentOnChain(
  signature: string,
  expectedAmount: number,
  expectedRecipient: string
): Promise<{ success: boolean; error?: string }> {
  // In test mode, accept all test signatures
  if (TEST_MODE && signature.startsWith('TEST_')) {
    console.log('[TEST MODE] Accepting test signature:', signature);
    return { success: true };
  }

  try {
    const connection = getConnection();
    
    // Get transaction details
    const transaction = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0
    });
    
    if (!transaction) {
      return { success: false, error: 'Transaction not found' };
    }
    
    if (transaction.meta?.err) {
      return { success: false, error: 'Transaction failed' };
    }
    
    console.log('[USDC Payment] Transaction verified:', signature);
    
    return { success: true };
    
  } catch (error) {
    console.error('[USDC Payment] Verification error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}
