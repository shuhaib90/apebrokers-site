const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ApeBrokerDesk - Invariant & Property-Based Fuzz Tests", function () {
  let token, nft, desk;
  let owner, admin, treasury, users;

  const DECIMALS = 18n;
  const ONE_TOKEN = 10n ** DECIMALS;
  const ACTIVATION_FEE = 349_693n * ONE_TOKEN;
  const BASE_BOOST_COST = 10_000n * ONE_TOKEN;
  const BASE_DESK_WEIGHT = 100n;

  beforeEach(async function () {
    const signers = await ethers.getSigners();
    [owner, admin, treasury, ...users] = signers;

    // Deploy Mock ERC20 ($APEBROKE)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("ApeBroke Token", "APEBROKE", 18);
    await token.waitForDeployment();

    // Deploy Mock ERC721 (Ape Broker NFT)
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    nft = await MockERC721.deploy("Ape Broker NFT", "APEBRK");
    await nft.waitForDeployment();

    // Deploy ApeBrokerDesk
    const ApeBrokerDesk = await ethers.getContractFactory("ApeBrokerDesk");
    desk = await ApeBrokerDesk.deploy(
      await token.getAddress(),
      await nft.getAddress(),
      admin.address,
      treasury.address,
      BASE_BOOST_COST,
      BASE_DESK_WEIGHT
    );
    await desk.waitForDeployment();

    const deskAddress = await desk.getAddress();

    // Setup 10 users with NFTs and tokens
    for (let i = 0; i < 10; i++) {
      const user = users[i];
      await nft.mint(user.address, i + 1);
      await token.mint(user.address, 10_000_000n * ONE_TOKEN);
      await token.connect(user).approve(deskAddress, ethers.MaxUint256);
    }
  });

  it("Invariant 1: boostCount <= 5 across arbitrary random boost sequences", async function () {
    // Activate 10 desks
    for (let i = 0; i < 10; i++) {
      await desk.connect(users[i]).activateDesk(i + 1);
    }

    // Try random number of boosts (up to 10 attempts per desk)
    for (let i = 0; i < 10; i++) {
      const attempts = 1 + Math.floor(Math.random() * 8);
      for (let a = 0; a < attempts; a++) {
        const count = await desk.getBoostCount(i + 1);
        if (count < 5) {
          await desk.connect(users[i]).boostDesk(i + 1);
        } else {
          await expect(desk.connect(users[i]).boostDesk(i + 1))
            .to.be.revertedWithCustomError(desk, "MaxBoostsReached");
        }
      }
      expect(await desk.getBoostCount(i + 1)).to.be.lte(5);
    }
  });

  it("Invariant 2: totalClaimedRewards <= totalDepositedRewards across randomized multi-epoch deposits", async function () {
    // Activate all 10 desks with varying boost counts
    for (let i = 0; i < 10; i++) {
      await desk.connect(users[i]).activateDesk(i + 1);
      const boosts = Math.floor(Math.random() * 6); // 0 to 5 boosts
      for (let b = 0; b < boosts; b++) {
        await desk.connect(users[i]).boostDesk(i + 1);
      }
    }

    let totalDeposited = 0n;

    // Simulate 5 random ETH deposits
    for (let d = 0; d < 5; d++) {
      const randomEth = ethers.parseEther((0.5 + Math.random() * 3).toFixed(4));
      totalDeposited += randomEth;
      await desk.connect(admin).depositRewards({ value: randomEth });

      // Fast-forward time randomly within epochs
      await ethers.provider.send("evm_increaseTime", [3600 + Math.floor(Math.random() * 18000)]);
      await ethers.provider.send("evm_mine");
    }

    // Users claim rewards
    for (let i = 0; i < 10; i++) {
      const pending = await desk.getPendingRewards(i + 1);
      if (pending > 0n) {
        await desk.connect(users[i]).claimRewards(i + 1);
      }
    }

    const totalClaimed = await desk.totalEthRewardsClaimed();
    const contractEthBalance = await desk.getRewardPoolBalance();

    // INVARIANT: Claimed rewards cannot exceed deposited rewards
    expect(totalClaimed).to.be.lte(totalDeposited);
    // Solvency: Claimed + remaining balance must equal total deposited (within dust remainder)
    expect(totalClaimed + contractEthBalance).to.equal(totalDeposited);
  });

  it("Invariant 3: Boost weight never generates retroactive rewards", async function () {
    await desk.connect(users[0]).activateDesk(1); // 100 weight
    await desk.connect(users[1]).activateDesk(2); // 100 weight

    // Period 1: Deposit 2 ETH
    await desk.connect(admin).depositRewards({ value: ethers.parseEther("2.0") });
    // Both users have 1.0 ETH pending
    const user0P1 = await desk.getPendingRewards(1);
    expect(user0P1).to.equal(ethers.parseEther("1.0"));

    // User 0 now max-boosts to 5 (weight 600)
    for (let b = 0; b < 5; b++) {
      await desk.connect(users[0]).boostDesk(1);
    }
    expect(await desk.getDeskWeight(1)).to.equal(600n);

    // INVARIANT: User 0's pending rewards from Period 1 MUST remain exactly 1.0 ETH
    const user0PostBoost = await desk.getPendingRewards(1);
    expect(user0PostBoost).to.equal(ethers.parseEther("1.0"));
  });

  it("Invariant 4: Protocol fees ($APEBROKE) cannot be withdrawn as reward ETH", async function () {
    // Collect 5 activations + 5 boosts = protocol fees in APEBROKE
    for (let i = 0; i < 5; i++) {
      await desk.connect(users[i]).activateDesk(i + 1);
      await desk.connect(users[i]).boostDesk(i + 1);
    }

    const apeBrokeFees = await desk.getProtocolFeeBalance();
    expect(apeBrokeFees).to.be.gt(0n);

    // Deposit ETH rewards
    const ethDeposit = ethers.parseEther("5.0");
    await desk.connect(admin).depositRewards({ value: ethDeposit });

    // Admin claims ALL APEBROKE protocol fees
    await desk.connect(admin).claimProtocolFees(apeBrokeFees);

    // INVARIANT: The ETH reward pool balance MUST remain 100% intact
    expect(await desk.getRewardPoolBalance()).to.equal(ethDeposit);
    expect(await desk.getProtocolFeeBalance()).to.equal(0n);
  });
});
