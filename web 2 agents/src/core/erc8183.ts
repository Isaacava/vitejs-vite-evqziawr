import { createPublicClient, createWalletClient, http, keccak256, stringToBytes, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";

const COMMERCE_ABI = [
  { type: "function", name: "getJob", stateMutability: "view", inputs: [{ name: "jobId", type: "uint256" }], outputs: [{ name: "job", type: "tuple", components: [
    { name: "id", type: "uint256" }, { name: "client", type: "address" }, { name: "provider", type: "address" }, { name: "evaluator", type: "address" }, { name: "description", type: "string" }, { name: "budget", type: "uint256" }, { name: "expiredAt", type: "uint256" }, { name: "status", type: "uint8" }, { name: "hook", type: "address" }, { name: "submittedAt", type: "uint256" }, { name: "deliverable", type: "bytes32" }
  ] }] },
  { type: "function", name: "submit", stateMutability: "nonpayable", inputs: [{ name: "jobId", type: "uint256" }, { name: "deliverable", type: "bytes32" }, { name: "optParams", type: "bytes" }], outputs: [] },
] as const;

const commerceAddress = (process.env.ERC8183_COMMERCE_ADDRESS || "0xa206c0517b6371c6638cd9e4a42cc9f02a33b0de") as Address;
const rpcUrl = process.env.ERC8183_RPC_URL || process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com";
const publicClient = createPublicClient({ chain: bscTestnet, transport: http(rpcUrl) });

export type Erc8183Job = {
  id: bigint; client: Address; provider: Address; evaluator: Address; description: string; budget: bigint; expiredAt: bigint; status: number; hook: Address; submittedAt: bigint; deliverable: Hex;
};

export async function getJob(jobId: string | number): Promise<Erc8183Job> {
  return publicClient.readContract({ address: commerceAddress, abi: COMMERCE_ABI, functionName: "getJob", args: [BigInt(jobId)] }) as Promise<Erc8183Job>;
}

export function deliverableHash(content: string): Hex {
  return keccak256(stringToBytes(content));
}

export async function submitJob(jobId: string | number, deliverable: Hex) {
  const key = process.env.ERC8183_PROVIDER_PRIVATE_KEY as Hex | undefined;
  if (!key) throw new Error("ERC8183_PROVIDER_PRIVATE_KEY is required to submit jobs");
  const account = privateKeyToAccount(key);
  const walletClient = createWalletClient({ account, chain: bscTestnet, transport: http(rpcUrl) });
  const job = await getJob(jobId);
  if (job.status !== 1) throw new Error(`ERC-8183 job ${jobId} must be Funded before submission; current status=${job.status}`);
  if (job.provider.toLowerCase() !== account.address.toLowerCase()) throw new Error(`Provider wallet ${account.address} is not the ERC-8183 provider for job ${jobId}`);
  if (job.expiredAt <= BigInt(Math.floor(Date.now() / 1000))) throw new Error(`ERC-8183 job ${jobId} has expired`);
  const hash = await walletClient.writeContract({ address: commerceAddress, abi: COMMERCE_ABI, functionName: "submit", args: [BigInt(jobId), deliverable, "0x"] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  return { tx_hash: hash, block_number: receipt.blockNumber, provider: account.address, deliverable };
}

export function erc8183Metadata() {
  return { protocol: "erc-8183", role: "provider", network: "bsc-testnet", chain_id: 97, commerce_contract: commerceAddress, lifecycle: ["Open", "Funded", "Submitted", "Completed", "Rejected", "Expired"], submission: "submit(jobId, deliverable, optParams)" };
}
