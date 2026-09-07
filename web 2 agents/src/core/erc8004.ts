import { createPublicClient, createWalletClient, decodeEventLog, http, type Address, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { bscTestnet } from "viem/chains";

const IDENTITY_REGISTRY = (process.env.ERC8004_IDENTITY_REGISTRY || "0x8004A818BFB912233c491871b3d84c89A494BD9e") as Address;
const RPC_URL = process.env.ERC8183_RPC_URL || process.env.BSC_TESTNET_RPC_URL || "https://bsc-testnet-rpc.publicnode.com";
const MAX_LOG_RANGE = 50_000n;

const ABI = [
  { type: "function", name: "register", stateMutability: "nonpayable", inputs: [{ name: "agentURI", type: "string" }], outputs: [{ name: "agentId", type: "uint256" }] },
  { type: "event", name: "Registered", anonymous: false, inputs: [
    { name: "agentId", type: "uint256", indexed: true },
    { name: "agentURI", type: "string", indexed: false },
    { name: "owner", type: "address", indexed: true },
  ] },
] as const;

const publicClient = createPublicClient({ chain: bscTestnet, transport: http(RPC_URL) });

export type Agent8004Registration = {
  agent_id: string;
  agent_registry: string;
  agent_uri: string;
  owner: Address;
  chain_id: 97;
};

function providerAccount() {
  const key = process.env.ERC8183_PROVIDER_PRIVATE_KEY as Hex | undefined;
  if (!key) throw new Error("ERC8183_PROVIDER_PRIVATE_KEY is required for ERC-8004 registration");
  return privateKeyToAccount(key);
}

async function findRecentRegistration(owner: Address, agentURI: string) {
  const latestBlock = await publicClient.getBlockNumber();
  const fromBlock = latestBlock > MAX_LOG_RANGE - 1n ? latestBlock - (MAX_LOG_RANGE - 1n) : 0n;
  const existing = await publicClient.getLogs({
    address: IDENTITY_REGISTRY,
    event: ABI[1],
    args: { owner },
    fromBlock,
    toBlock: latestBlock,
  });

  return existing.find((log) => log.args.agentURI === agentURI && log.args.agentId !== undefined);
}

export async function ensureAgent8004Registration(agentURI: string): Promise<Agent8004Registration> {
  const owner = providerAccount();
  const match = await findRecentRegistration(owner.address, agentURI);
  if (match?.args.agentId !== undefined) {
    return { agent_id: String(match.args.agentId), agent_registry: `eip155:97:${IDENTITY_REGISTRY}`, agent_uri: agentURI, owner: owner.address, chain_id: 97 };
  }

  const wallet = createWalletClient({ account: owner, chain: bscTestnet, transport: http(RPC_URL) });
  const txHash = await wallet.writeContract({ address: IDENTITY_REGISTRY, abi: ABI, functionName: "register", args: [agentURI] });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  const registered = receipt.logs.map((log) => {
    try {
      if (log.address.toLowerCase() !== IDENTITY_REGISTRY.toLowerCase()) return null;
      const decoded = decodeEventLog({ abi: ABI, data: log.data, topics: log.topics });
      return decoded.eventName === "Registered" ? decoded.args.agentId : null;
    } catch { return null; }
  }).find((value): value is bigint => typeof value === "bigint");
  if (registered === undefined) throw new Error(`ERC-8004 registration transaction ${txHash} did not return a Registered event`);
  return { agent_id: String(registered), agent_registry: `eip155:97:${IDENTITY_REGISTRY}`, agent_uri: agentURI, owner: owner.address, chain_id: 97 };
}

export function erc8004RegistrationDocument(input: {
  name: string;
  description: string;
  image?: string;
  services: Array<{ name: string; endpoint: string; version?: string }>;
  agentId?: string | null;
}) {
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: input.name,
    description: input.description,
    image: input.image || "",
    services: input.services,
    x402Support: false,
    active: true,
    registrations: input.agentId ? [{ agentId: Number(input.agentId), agentRegistry: `eip155:97:${IDENTITY_REGISTRY}` }] : [],
    supportedTrust: ["reputation", "crypto-economic"],
  };
}

export function erc8004Metadata() {
  return {
    protocol: "erc-8004",
    network: "bsc-testnet",
    chain_id: 97,
    identity_registry: IDENTITY_REGISTRY,
    auto_registration: true,
    registry_format: `eip155:97:${IDENTITY_REGISTRY}`,
  };
}
