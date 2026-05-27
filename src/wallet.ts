import { x402Client } from "@x402/fetch";

export interface Wallet {
  register(client: x402Client): Promise<void> | void;
}

export class EVMWallet implements Wallet {
  readonly #privateKey: `0x${string}`;
  #address: string | undefined;

  constructor(privateKey: `0x${string}`) {
    this.#privateKey = privateKey;
  }

  async register(client: x402Client): Promise<void> {
    const { privateKeyToAccount } = await import("viem/accounts");
    const { ExactEvmScheme, toClientEvmSigner } = await import("@x402/evm");
    const account = privateKeyToAccount(this.#privateKey);
    this.#address = account.address;
    const signer = toClientEvmSigner(account);
    client.register("eip155:*", new ExactEvmScheme(signer));
  }

  toString(): string {
    return this.#address ? `EVMWallet(${this.#address})` : "EVMWallet(unregistered)";
  }
}

export class SVMWallet implements Wallet {
  readonly #privateKey: string;
  readonly #network: `${string}:${string}` | undefined;
  #pubkey: string | undefined;

  constructor(privateKey: string, network?: `${string}:${string}`) {
    this.#privateKey = privateKey;
    this.#network = network;
  }

  async register(client: x402Client): Promise<void> {
    const { createKeyPairSignerFromBytes } = await import("@solana/kit");
    const { base58 } = await import("@scure/base");
    const { ExactSvmScheme, toClientSvmSigner, SOLANA_MAINNET_CAIP2 } = await import("@x402/svm");
    const keyBytes = base58.decode(this.#privateKey);
    const signer = await createKeyPairSignerFromBytes(keyBytes);
    this.#pubkey = String(signer.address);
    client.register(this.#network ?? SOLANA_MAINNET_CAIP2, new ExactSvmScheme(toClientSvmSigner(signer)));
  }

  toString(): string {
    return this.#pubkey ? `SVMWallet(${this.#pubkey})` : "SVMWallet(unregistered)";
  }
}
