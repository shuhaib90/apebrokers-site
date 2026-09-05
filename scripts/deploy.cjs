const fs = require("fs");
const path = require("path");
const { ethers, network } = require("hardhat");

async function main() {
  console.log("==================================================");
  console.log("   DEPLOYING APE BROKER DESK TO " + network.name.toUpperCase());
  console.log("==================================================");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer Address:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", ethers.formatEther(balance), "ETH");

  // Read environment configurations with fallback to confirmed Robinhood contracts
  const APEBROKE_TOKEN_ADDRESS =
    process.env.APEBROKE_TOKEN_ADDRESS || "0xe0F384ebCede975342c5431aCad515b4A1B862cc";
  const APE_BROKER_NFT_ADDRESS =
    process.env.APE_BROKER_NFT_ADDRESS || "0x5b9ca37d499eace8f526320d6edea10fb73d4ec6";
  const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || deployer.address;
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || deployer.address;
  const BASE_BOOST_COST = process.env.BASE_BOOST_COST
    ? BigInt(process.env.BASE_BOOST_COST)
    : 699_386n * 10n ** 18n;
  const BASE_DESK_WEIGHT = process.env.BASE_DESK_WEIGHT
    ? BigInt(process.env.BASE_DESK_WEIGHT)
    : 100n;

  console.log("\nDeployment Parameters:");
  console.log("- $APEBROKE Token Address:", APEBROKE_TOKEN_ADDRESS);
  console.log("- Ape Broker NFT Address :", APE_BROKER_NFT_ADDRESS);
  console.log("- Admin Address          :", ADMIN_ADDRESS);
  console.log("- Treasury Address       :", TREASURY_ADDRESS);
  console.log("- Base Boost Cost        :", BASE_BOOST_COST.toString());
  console.log("- Base Desk Weight       :", BASE_DESK_WEIGHT.toString());

  // Deploy ApeBrokerDesk contract
  console.log("\nDeploying ApeBrokerDesk contract...");
  const ApeBrokerDesk = await ethers.getContractFactory("ApeBrokerDesk");
  const desk = await ApeBrokerDesk.deploy(
    APEBROKE_TOKEN_ADDRESS,
    APE_BROKER_NFT_ADDRESS,
    ADMIN_ADDRESS,
    TREASURY_ADDRESS,
    BASE_BOOST_COST,
    BASE_DESK_WEIGHT
  );

  await desk.waitForDeployment();
  const deskAddress = await desk.getAddress();
  console.log(">>> ApeBrokerDesk successfully deployed to:", deskAddress);

  // Read ABI from Hardhat artifact
  const artifactPath = path.join(
    __dirname,
    "../artifacts/contracts/ApeBrokerDesk.sol/ApeBrokerDesk.json"
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
    contractAddress: deskAddress,
    network: network.name,
    chainId: network.config.chainId || 1337,
    apeBrokeTokenAddress: APEBROKE_TOKEN_ADDRESS,
    apeBrokerNftAddress: APE_BROKER_NFT_ADDRESS,
    adminAddress: ADMIN_ADDRESS,
    treasuryAddress: TREASURY_ADDRESS,
    baseBoostCost: BASE_BOOST_COST.toString(),
    baseDeskWeight: BASE_DESK_WEIGHT.toString(),
    deployedAt: new Date().toISOString(),
    abi,
  };

  const outputPath = path.join(configDir, "apeBrokerDesk.json");
  fs.writeFileSync(outputPath, JSON.stringify(deploymentData, null, 2));
  console.log("\nSaved frontend deployment artifact to:", outputPath);
  console.log("==================================================");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
