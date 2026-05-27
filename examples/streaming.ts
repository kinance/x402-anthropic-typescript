import { X402Anthropic, EVMWallet } from "@kinance/x402-anthropic";

const wallet = new EVMWallet("0x_YOUR_PRIVATE_KEY");
const client = new X402Anthropic({
  wallet,
  baseURL: "https://your-x402-gateway.example.com",
});

const stream = await client.messages.stream({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Tell me a short story." }],
});

for await (const text of stream.textStream) {
  process.stdout.write(text);
}
console.log();
