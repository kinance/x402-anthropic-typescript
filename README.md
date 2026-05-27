# x402-anthropic-typescript

[![npm](https://img.shields.io/npm/v/x402-anthropic)](https://www.npmjs.com/package/x402-anthropic)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green)](https://github.com/kinance/x402-anthropic-typescript/blob/main/LICENSE)
[![CI](https://github.com/kinance/x402-anthropic-typescript/actions/workflows/node.yml/badge.svg)](https://github.com/kinance/x402-anthropic-typescript/actions)

x402 payment transport for the [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-js).

Wrap the standard `Anthropic` client with a crypto wallet. When the server responds with **HTTP 402**, the library automatically signs a USDC payment and retries — zero code changes needed. Follows the pattern introduced by [qntx/x402-openai-typescript](https://github.com/qntx/x402-openai-typescript).

## Install

```bash
npm install x402-anthropic @x402/evm viem        # EVM (Base, Ethereum)
npm install x402-anthropic @x402/svm @solana/kit  # SVM (Solana)
npm install x402-anthropic @x402/evm @x402/svm viem @solana/kit  # all chains
```

## Quick start

```ts
import { X402Anthropic, EVMWallet } from "x402-anthropic";

const client = new X402Anthropic({
  wallet: new EVMWallet("0x..."),
  baseURL: "https://your-x402-gateway.example.com",
});

const message = await client.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello!" }],
});
console.log(message.content[0]);
```

Swap `EVMWallet` for `SVMWallet` to pay on Solana — the API is identical.

## Usage

### Streaming

```ts
const stream = await client.messages.stream({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Tell me a story." }],
});
for await (const text of stream.textStream) {
  process.stdout.write(text);
}
```

### Payment policies

```ts
import { X402Anthropic, EVMWallet, preferNetwork, maxAmount } from "x402-anthropic";

const client = new X402Anthropic({
  wallet: new EVMWallet("0x..."),
  policies: [preferNetwork("eip155:8453"), maxAmount(1_000_000n)],  // Base, max $1 USDC
  baseURL: "...",
});
```

> **Safety**: use a dedicated wallet with limited funds and always set a `maxAmount` policy before pointing this at an untrusted gateway.

## API reference

### `X402Anthropic`

Drop-in replacement for `Anthropic` from `@anthropic-ai/sdk`.

| Parameter | Type | Description |
| :-- | :-- | :-- |
| `wallet` | `Wallet` | Wallet adapter for signing payments |
| `policies` | `Policy[]` | Payment policies (chain preference, amount cap) |
| `baseURL` | `string` | Gateway URL (required — points at your x402 server) |

All standard Anthropic options (`timeout`, `maxRetries`, `apiKey`, …) are forwarded.

### Wallet adapters

| Class | Chain | Peer deps |
| :-- | :-- | :-- |
| `EVMWallet(privateKey)` | Base, Ethereum, any EVM | `@x402/evm viem` |
| `SVMWallet(privateKey)` | Solana | `@x402/svm @solana/kit` |

Implement the `Wallet` interface to add a new chain.

### Policy helpers

| Function | Effect |
| :-- | :-- |
| `preferNetwork(caip2)` | Prefer a specific chain (falls back to any if unavailable) |
| `preferScheme(scheme)` | Prefer a payment scheme (e.g. `"exact"`) |
| `maxAmount(units)` | Skip payment requirements above this USDC unit amount |

## Examples

```bash
EVM_PRIVATE_KEY="0x..."        npx tsx examples/basic.ts
EVM_PRIVATE_KEY="0x..."        npx tsx examples/streaming.ts
```

## Related

- [x402-anthropic-python](https://github.com/kinance/x402-anthropic-python) — Python version of this library
- [qntx/x402-openai-typescript](https://github.com/qntx/x402-openai-typescript) — OpenAI SDK equivalent
- [coinbase/x402](https://github.com/coinbase/x402) — x402 protocol spec and reference implementation

## License

MIT
