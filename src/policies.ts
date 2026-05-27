import type { PaymentRequirements } from "@x402/fetch";

export type Policy = (x402Version: number, requirements: PaymentRequirements[]) => PaymentRequirements[];

export function preferNetwork(network: string): Policy {
  return (_version, reqs) => {
    const preferred = reqs.filter((r) => r.network === network);
    return preferred.length > 0 ? preferred : reqs;
  };
}

export function preferScheme(scheme: string): Policy {
  return (_version, reqs) => {
    const preferred = reqs.filter((r) => r.scheme === scheme);
    return preferred.length > 0 ? preferred : reqs;
  };
}

export function maxAmount(maxUnits: bigint | number): Policy {
  const max = BigInt(maxUnits);
  return (_version, reqs) => {
    const affordable = reqs.filter((r) => {
      const amount = BigInt(
        (r as { amount?: string }).amount ??
          (r as { maxAmountRequired?: string }).maxAmountRequired ??
          "0"
      );
      return amount <= max;
    });
    return affordable;
  };
}
