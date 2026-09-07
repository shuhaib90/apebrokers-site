const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log("   DEPLOYING APE BROKER LUCKY DRAW TO " + network.name.toUpperCase());
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");

  // Contract Addresses on Robinhood EVM
  const APEBROKE_TOKEN_ADDRESS =
    process.env.APEBROKE_TOKEN_ADDRESS || "0xe0F384ebCede975342c5431aCad515b4A1B862cc";
  const APE_BROKER_NFT_ADDRESS =
    process.env.APE_BROKER_NFT_ADDRESS || "0xd3b030e9281fcd8797af6dc437636b24bdfe7902";
  const ADMIN_ADDRESS =
    process.env.ADMIN_ADDRESS ||
    process.env.VITE_ADMIN_ADDRESS ||
    "0xb8E3DfDd19b6Bf35b9Fd87F8373F7f82C53bc93C";

  console.log("\nLucky Draw Deployment Parameters:");
  console.log("- $APEBROKE Token Address:", APEBROKE_TOKEN_ADDRESS);
  console.log("- Ape Broker NFT Address :", APE_BROKER_NFT_ADDRESS);
  console.log("- Admin Address          :", ADMIN_ADDRESS);

  // Estimate gas dynamically
  const ApeBrokerLuckyDraw = await ethers.getContractFactory("ApeBrokerLuckyDraw");
  const deployTx = await ApeBrokerLuckyDraw.getDeployTransaction(
    APEBROKE_TOKEN_ADDRESS,
    APE_BROKER_NFT_ADDRESS,
    ADMIN_ADDRESS
  );
  const estimatedGas = await deployer.estimateGas(deployTx);
  const gasLimit = (estimatedGas * 110n) / 100n;

  const feeData = await ethers.provider.getFeeData();
  const latestBlock = await ethers.provider.getBlock("latest");
  const baseFee =
    latestBlock && latestBlock.baseFeePerGas
      ? latestBlock.baseFeePerGas
      : feeData.gasPrice || ethers.parseUnits("0.35", "gwei");
  const maxPriorityFeePerGas = ethers.parseUnits("0.01", "gwei");
  const maxFeePerGas = (baseFee * 115n) / 100n + maxPriorityFeePerGas;

  console.log("Estimated Gas   :", estimatedGas.toString());
  console.log("Gas Limit       :", gasLimit.toString());
  console.log("Base Fee        :", ethers.formatUnits(baseFee, "gwei"), "gwei");
  console.log("Max Fee         :", ethers.formatUnits(maxFeePerGas, "gwei"), "gwei");

  console.log("\nDeploying ApeBrokerLuckyDraw contract...");
  const luckyDraw = await ApeBrokerLuckyDraw.deploy(
    APEBROKE_TOKEN_ADDRESS,
    APE_BROKER_NFT_ADDRESS,
    ADMIN_ADDRESS,
    {
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
    }
  );

  console.log("Transaction Hash:", luckyDraw.deploymentTransaction().hash);
  console.log("Waiting for confirmation on Robinhood EVM...");
  await luckyDraw.waitForDeployment();

  const deployedAddress = await luckyDraw.getAddress();
  console.log("\n==================================================");
  console.log(">>> APE BROKER LUCKY DRAW DEPLOYED TO:", deployedAddress);
  console.log("==================================================");

  // Save config to frontend
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ApeBrokerLuckyDraw.sol/ApeBrokerLuckyDraw.json"
  );
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const configPath = path.join(__dirname, "../src/config/apeBrokerLuckyDraw.json");
  const configData = {
    contractAddress: deployedAddress,
    network: network.name,
    chainId: network.config.chainId || 4663,
    apeBrokeTokenAddress: APEBROKE_TOKEN_ADDRESS,
    apeBrokerNftAddress: APE_BROKER_NFT_ADDRESS,
    adminAddress: ADMIN_ADDRESS,
    treasuryAddress: ADMIN_ADDRESS,
    deployedAt: new Date().toISOString(),
    txHash: luckyDraw.deploymentTransaction().hash,
    abi: artifact.abi,
  };

  fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
  console.log("Configuration written to:", configPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
