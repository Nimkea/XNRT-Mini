"use client";
import React, { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { VersionedTransaction } from "@solana/web3.js";
import { getQuote, buildSwapTx, Quote } from "../lib/jupiter";
import { XNRT, USDT, USDC, WSOL } from "../lib/constants";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
// FIX: Import Buffer to be used for transaction deserialization.
import { Buffer } from "buffer";

const TOKENS = [
  { mint: USDT, symbol: "USDT", decimals: 6, name: "Tether" },
  { mint: USDC, symbol: "USDC", decimals: 6, name: "USD Coin" },
  { mint: WSOL, symbol: "SOL", decimals: 9, name: "Wrapped SOL" },
  { mint: XNRT, symbol: "XNRT", decimals: 9, name: "XNRT" },
];

function toAtomic(amount: string, decimals: number): string {
  if (!amount || isNaN(Number(amount))) return "0";
  const [i, f = ""] = amount.split(".");
  const frac = (f + "0".repeat(decimals)).slice(0, decimals);
  try {
    const bigIntValue = BigInt(i + frac);
    return bigIntValue.toString();
  } catch (error) {
    console.error("Error converting to atomic amount:", error);
    return "0";
  }
}

const ArrowIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-slate-500">
        <path d="M12 5v14" />
        <path d="m19 12-7 7-7-7" />
    </svg>
);


export default function Swap() {
  const { publicKey, sendTransaction } = useWallet();
  const [from, setFrom] = useState(TOKENS[0]);   // default USDT
  const [to, setTo] = useState(TOKENS[3]);       // default XNRT
  const [amount, setAmount] = useState("10");    // human amount
  const [slippageBps, setSlippageBps] = useState(50); // 0.5%
  const [quote, setQuote] = useState<Quote | null>(null);
  const [outAmount, setOutAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [error, setError] = useState<string>("");

  const canSwap = publicKey && from && to && amount && Number(amount) > 0 && !swapping && quote;

  // Debounce quote fetching
  useEffect(() => {
    const controller = new AbortController();
    const fetchQuote = async () => {
        if (!amount || Number(amount) <= 0) {
            setOutAmount("");
            setQuote(null);
            return;
        }
        setLoading(true);
        setError("");
        try {
            const atomic = toAtomic(amount, from.decimals);
            const q = await getQuote({
                inputMint: from.mint,
                outputMint: to.mint,
                amount: atomic,
                slippageBps
            });
            if (!controller.signal.aborted) {
                setQuote(q);
                setOutAmount((Number(q.outAmount) / 10 ** to.decimals).toFixed(6));
            }
        } catch (e: any) {
            if (!controller.signal.aborted) {
                setOutAmount("");
                setQuote(null);
                setError(e.message || "Failed to get quote");
            }
        } finally {
            if (!controller.signal.aborted) {
                setLoading(false);
            }
        }
    };
    
    const timeoutId = setTimeout(fetchQuote, 500);

    return () => {
        controller.abort();
        clearTimeout(timeoutId);
    };
  }, [from, to, amount, slippageBps]);

  const handleSwitch = () => {
    const tempFrom = from;
    setFrom(to);
    setTo(tempFrom);
    setAmount(outAmount.toString());
  };

  async function onSwap() {
    if (!publicKey || !quote) return;
    try {
      setSwapping(true);
      setError("");
      const { swapTransaction } = await buildSwapTx({
        quote: quote,
        userPublicKey: publicKey.toBase58(),
      });

      const txBuf = Buffer.from(swapTransaction, "base64");
      const tx = VersionedTransaction.deserialize(txBuf);
      
      const sig = await sendTransaction(tx, { skipPreflight: false });
      alert(`Swap successful! Signature: ${sig}`);
    } catch (e:any) {
      setError(e.message || "Swap failed. Please try again.");
      console.error(e);
    } finally {
      setSwapping(false);
      setAmount(""); // Reset amount after swap
    }
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 shadow-2xl shadow-slate-950/50 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">XNRT Mini Exchange</h1>
        <WalletMultiButton style={{ 
            backgroundColor: '#10b981', 
            color: '#000',
            borderRadius: '0.75rem',
            fontWeight: 600
        }} />
      </div>
      
      {/* From */}
      <div className="bg-slate-800 p-4 rounded-xl space-y-2 relative">
        <label className="text-xs text-slate-400">From</label>
        <div className="flex items-center justify-between gap-4">
          <input
            type="number"
            className="w-full bg-transparent text-2xl font-mono text-white placeholder-slate-500 focus:outline-none"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
          />
          <select
            className="bg-slate-700 text-white font-semibold rounded-lg p-2 focus:outline-none"
            value={from.mint}
            onChange={(e) => setFrom(TOKENS.find(t => t.mint === e.target.value)!)}
          >
            {TOKENS.map(t => <option key={t.mint} value={t.mint}>{t.symbol}</option>)}
          </select>
        </div>
      </div>
      
      <div className="flex justify-center my-[-8px]">
        <button onClick={handleSwitch} className="z-10 bg-slate-700 p-2 rounded-full hover:bg-slate-600 transition-transform duration-300 hover:rotate-180">
          <ArrowIcon />
        </button>
      </div>

      {/* To */}
      <div className="bg-slate-800 p-4 rounded-xl space-y-2">
        <label className="text-sm text-slate-400">To (estimated)</label>
        <div className="flex items-center justify-between gap-4">
          <input 
            className="w-full bg-transparent text-2xl font-mono text-slate-400 focus:outline-none" 
            value={loading ? "..." : outAmount} 
            readOnly 
            placeholder="0.0"
          />
          <select
            className="bg-slate-700 text-white font-semibold rounded-lg p-2 focus:outline-none"
            value={to.mint}
            onChange={(e) => setTo(TOKENS.find(t => t.mint === e.target.value)!)}
          >
            {TOKENS.map(t => <option key={t.mint} value={t.mint}>{t.symbol}</option>)}
          </select>
        </div>
      </div>
      
      {quote && (
        <div className="text-xs text-slate-400 flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg">
            <span>Price Impact: <span className={Number(quote.priceImpactPct) > 0.01 ? "text-amber-400" : "text-emerald-400"}>{(Number(quote.priceImpactPct) * 100).toFixed(4)}%</span></span>
            <div className="flex items-center gap-2">
                <span>Slippage</span>
                 <input
                    type="number"
                    className="w-16 bg-slate-700 rounded-md p-1 text-center text-white"
                    value={slippageBps}
                    onChange={(e) => setSlippageBps(Number(e.target.value))}
                    min={10} max={1000} step={10}
                />
                <span>bps</span>
            </div>
        </div>
      )}

      {error && <div className="text-red-400 text-center text-sm bg-red-900/30 p-2 rounded-lg">{error}</div>}

      <button
        disabled={!canSwap}
        onClick={onSwap}
        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed text-black font-semibold text-lg p-3 rounded-xl transition-all duration-300"
      >
        {publicKey ? (swapping ? "Swapping…" : "Swap") : "Connect Wallet"}
      </button>
    </div>
  );
}