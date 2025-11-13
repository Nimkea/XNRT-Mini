
import { SolanaProviders } from "./components/WalletProvider";
import Swap from "./components/Swap";

export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <SolanaProviders>
        <div className="w-full max-w-lg mx-auto">
          <Swap />
        </div>
      </SolanaProviders>
    </main>
  );
}
