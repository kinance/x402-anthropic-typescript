import Anthropic from "@anthropic-ai/sdk";
import { x402Client, wrapFetchWithPayment } from "@x402/fetch";
import type { Wallet } from "./wallet.js";
import type { Policy } from "./policies.js";

type FetchFn = typeof globalThis.fetch;

interface X402AnthropicOptions extends Omit<ConstructorParameters<typeof Anthropic>[0], "fetch"> {
  wallet: Wallet;
  policies?: Policy[];
}

function createLazyX402Fetch(walletFn: () => Promise<x402Client>): FetchFn {
  let fetchPromise: Promise<FetchFn> | null = null;

  return async (input, init) => {
    if (!fetchPromise) {
      fetchPromise = walletFn()
        .then((client) => wrapFetchWithPayment(globalThis.fetch, client) as FetchFn)
        .catch((err) => { fetchPromise = null; throw err; });
    }
    const wrappedFetch = await fetchPromise;
    return wrappedFetch(input, init);
  };
}

export class X402Anthropic extends Anthropic {
  constructor({ wallet, policies = [], ...options }: X402AnthropicOptions) {
    const x402Fetch = createLazyX402Fetch(async () => {
      const client = new x402Client();
      await wallet.register(client);
      for (const policy of policies) {
        client.registerPolicy(policy);
      }
      return client;
    });

    super({
      apiKey: "x402",
      ...options,
      fetch: x402Fetch as FetchFn,
    });
  }
}
