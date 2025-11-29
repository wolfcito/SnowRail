import { config } from "./env.js";

// Network configuration type
export type NetworkConfig = {
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  stablecoins: {
    usdc: string;
    usdt: string;
  };
};

// Supported EVM networks for SnowRail
const networks: Record<string, NetworkConfig> = {
  avalanche: {
    name: "Avalanche C-Chain",
    chainId: 43114,
    rpcUrl: config.rpcUrls.avalanche,
    explorerUrl: "https://snowtrace.io",
    nativeCurrency: {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
    },
    stablecoins: {
      // Mainnet USDC.e on Avalanche
      usdc: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
      usdt: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    },
  },
  "avalanche-fuji": {
    name: "Avalanche Fuji Testnet",
    chainId: 43113,
    rpcUrl: config.rpcUrls["avalanche-fuji"],
    explorerUrl: "https://testnet.snowtrace.io",
    nativeCurrency: {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
    },
    stablecoins: {
      // Fuji testnet token addresses (test tokens)
      usdc: "0x5425890298aed601595a70AB815c96711a31Bc65", // Test USDC on Fuji
      usdt: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7", // Test USDT on Fuji
    },
  },
  // Alias for backward compatibility
  fuji: {
    name: "Avalanche Fuji Testnet",
    chainId: 43113,
    rpcUrl: config.rpcUrls["avalanche-fuji"],
    explorerUrl: "https://testnet.snowtrace.io",
    nativeCurrency: {
      name: "Avalanche",
      symbol: "AVAX",
      decimals: 18,
    },
    stablecoins: {
      usdc: "0x5425890298aed601595a70AB815c96711a31Bc65",
      usdt: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    },
  },
  polygon: {
    name: "Polygon",
    chainId: 137,
    rpcUrl: config.rpcUrls.polygon,
    explorerUrl: "https://polygonscan.com",
    nativeCurrency: {
      name: "MATIC",
      symbol: "MATIC",
      decimals: 18,
    },
    stablecoins: {
      usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
      usdt: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    },
  },
};

// Get current network configuration based on env
export function getCurrentNetworkConfig(): NetworkConfig {
  const net = networks[config.network];
  if (!net) {
    throw new Error(`Unsupported network: ${config.network}`);
  }
  return net;
}

export { networks };


