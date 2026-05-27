import { X402Anthropic, EVMWallet } from "@kinance/x402-anthropic";

const wallet = new EVMWallet("0x_YOUR_PRIVATE_KEY");
const client = new X402Anthropic({
  wallet,
  baseURL: "https://your-x402-gateway.example.com",
});

const message = await client.messages.create({
  model: "claude-opus-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: "Hello, Claude!" }],
});

console.log(message.content[0].type === "text" ? message.content[0].text : "");
