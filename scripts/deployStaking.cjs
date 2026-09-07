const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log("   DEPLOYING APE BROKER STAKING TO " + network.name.toUpperCase());
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

  console.log("\nStaking Deployment Parameters:");
  console.log("- $APEBROKE Token Address:", APEBROKE_TOKEN_ADDRESS);
  console.log("- Ape Broker NFT Address :", APE_BROKER_NFT_ADDRESS);
  console.log("- Admin Address          :", ADMIN_ADDRESS);
  console.log("- Minimum NFT Holding    : 2 NFTs");
  console.log("- Lock Duration          : 24 Hours");

  const ApeBrokerStaking = await ethers.getContractFactory("ApeBrokerStaking");
  const staking = await ApeBrokerStaking.deploy(
    APEBROKE_TOKEN_ADDRESS,
    APE_BROKER_NFT_ADDRESS,
    ADMIN_ADDRESS
  );

  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();
  console.log(">>> ApeBrokerStaking successfully deployed to:", stakingAddress);

  // Read ABI from Hardhat artifact
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ApeBrokerStaking.sol/ApeBrokerStaking.json"
  );
  let abi = [];
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    abi = artifact.abi;
  }

  // Export deployment config for frontend integration
  const configDir = path.join(__dirname, "../src/config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const deploymentData = {
    contractAddress: stakingAddress,
    network: network.name,
    chainId: network.config.chainId || 4663,
    apeBrokeTokenAddress: APEBROKE_TOKEN_ADDRESS,
    apeBrokerNftAddress: APE_BROKER_NFT_ADDRESS,
    adminAddress: ADMIN_ADDRESS,
    minNftHolding: 2,
    lockDurationSeconds: 86400,
    abi: abi,
  };

  fs.writeFileSync(
    path.join(configDir, "apeBrokerStaking.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log(">>> Staking configuration saved to src/config/apeBrokerStaking.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
