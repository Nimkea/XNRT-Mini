const BASE = "https://quote-api.jup.ag";
const JUP_HEADERS: HeadersInit = { "Content-Type": "application/json" };

export type Quote = {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  priceImpactPct: number;
  routePlan: any[];
};

export async function getQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: string;        // integer, in smallest units
  slippageBps: number;   // e.g. 50 = 0.5%
  onlyDirectRoutes?: boolean;
}) {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps),
    onlyDirectRoutes: String(!!params.onlyDirectRoutes),
  });

  const res = await fetch(`${BASE}/v6/quote?${qs.toString()}`, { headers: JUP_HEADERS, cache: "no-store" });
  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Quote failed: ${res.status} ${errorBody}`);
  }
  return (await res.json()) as Quote;
}

export async function buildSwapTx(params: {
  quote: Quote;
  userPublicKey: string;
  wrapAndUnwrapSol?: boolean;
}): Promise<{ swapTransaction: string }> {

  const res = await fetch(`${BASE}/v6/swap`, {
    method: "POST",
    headers: JUP_HEADERS,
    body: JSON.stringify({
      quoteResponse: params.quote,
      userPublicKey: params.userPublicKey,
      wrapAndUnwrapSol: params.wrapAndUnwrapSol ?? true,
      dynamicComputeUnitLimit: true,
    }),
  });

  if (!res.ok) {
     const errorBody = await res.text();
    throw new Error(`Swap build failed: ${res.status} ${errorBody}`);
  }
  return await res.json();
}