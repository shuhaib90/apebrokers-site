const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ApeBrokerStaking - Comprehensive Production Test Suite", function () {
  let token, nft, staking;
  let owner, alice, bob, carol, nonHolder;
  let stakingAddress;

  const ONE_DAY = 24 * 60 * 60; // 86,400 seconds
  const TOKENS_100K = ethers.parseEther("100000");
  const TOKENS_300K = ethers.parseEther("300000");
  const TOKENS_600K = ethers.parseEther("600000");
  const TOKENS_1M = ethers.parseEther("1000000");

  beforeEach(async function () {
    [owner, alice, bob, carol, nonHolder] = await ethers.getSigners();

    // Deploy Mock ERC20 $APEBROKE (18 decimals)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("ApeBroke", "APEBROKE", 18);
    await token.waitForDeployment();

    // Deploy Mock ERC721 Ape Broker NFT
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    nft = await MockERC721.deploy("Ape Broker NFT", "ABNFT");
    await nft.waitForDeployment();

    // Deploy ApeBrokerStaking contract
    const ApeBrokerStaking = await ethers.getContractFactory("ApeBrokerStaking");
    staking = await ApeBrokerStaking.deploy(
      await token.getAddress(),
      await nft.getAddress(),
      owner.address
    );
    await staking.waitForDeployment();
    stakingAddress = await staking.getAddress();

    // Mint tokens to users
    await token.mint(alice.address, ethers.parseEther("1000000"));
    await token.mint(bob.address, ethers.parseEther("1000000"));
    await token.mint(carol.address, ethers.parseEther("1000000"));

    // Approve staking contract
    await token.connect(alice).approve(stakingAddress, ethers.MaxUint256);
    await token.connect(bob).approve(stakingAddress, ethers.MaxUint256);
    await token.connect(carol).approve(stakingAddress, ethers.MaxUint256);

    // Give Alice 2 NFTs (minimum requirement)
    await nft.mint(alice.address, 1);
    await nft.mint(alice.address, 2);

    // Give Bob 3 NFTs
    await nft.mint(bob.address, 3);
    await nft.mint(bob.address, 4);
    await nft.mint(bob.address, 5);

    // Give Carol 2 NFTs
    await nft.mint(carol.address, 6);
    await nft.mint(carol.address, 7);
  });

  describe("1. Deployment & Configuration", function () {
    it("Should initialize with correct addresses and constants", async function () {
      expect(await staking.apeBrokeToken()).to.equal(await token.getAddress());
      expect(await staking.apeBrokerNft()).to.equal(await nft.getAddress());
      expect(await staking.owner()).to.equal(owner.address);
      expect(await staking.LOCK_DURATION()).to.equal(BigInt(ONE_DAY));
      expect(await staking.REWARD_PERIOD()).to.equal(BigInt(ONE_DAY));
      expect(await staking.MIN_NFT_HOLDING()).to.equal(2n);
      expect(await staking.DEFAULT_REWARD_RATE_BPS()).to.equal(1000n); // 10%
    });

    it("Should revert deployment if zero address is provided", async function () {
      const Factory = await ethers.getContractFactory("ApeBrokerStaking");
      await expect(
        Factory.deploy(ethers.ZeroAddress, await nft.getAddress(), owner.address)
      ).to.be.revertedWithCustomError(staking, "ZeroAddress");

      await expect(
        Factory.deploy(await token.getAddress(), ethers.ZeroAddress, owner.address)
      ).to.be.revertedWithCustomError(staking, "ZeroAddress");

      await expect(
        Factory.deploy(await token.getAddress(), await nft.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(staking, "OwnableInvalidOwner");
    });
  });

  describe("2. NFT Holder Gating (Minimum 2 NFTs Required)", function () {
    it("Should revert if user holds 0 Ape Broker NFTs", async function () {
      await token.mint(nonHolder.address, TOKENS_100K);
      await token.connect(nonHolder).approve(stakingAddress, ethers.MaxUint256);

      await expect(staking.connect(nonHolder).stake(TOKENS_100K))
        .to.be.revertedWithCustomError(staking, "InsufficientNftBalance")
        .withArgs(0, 2);
    });

    it("Should revert if user holds only 1 Ape Broker NFT", async function () {
      await token.mint(nonHolder.address, TOKENS_100K);
      await token.connect(nonHolder).approve(stakingAddress, ethers.MaxUint256);
      await nft.mint(nonHolder.address, 99); // 1 NFT only

      expect(await nft.balanceOf(nonHolder.address)).to.equal(1n);

      await expect(staking.connect(nonHolder).stake(TOKENS_100K))
        .to.be.revertedWithCustomError(staking, "InsufficientNftBalance")
        .withArgs(1, 2);
    });

    it("Should allow staking when user holds at least 2 Ape Broker NFTs", async function () {
      expect(await nft.balanceOf(alice.address)).to.equal(2n);
      await expect(staking.connect(alice).stake(TOKENS_100K))
        .to.emit(staking, "Staked");

      const stats = await staking.getStakingStats();
      expect(stats.totalStaked).to.equal(TOKENS_100K);
      expect(stats.activePositionsCount).to.equal(1n);
    });
  });

  describe("3. Staking & 24-Hour Lock Enforcement", function () {
    it("Should record stake position with exact 24-hour lock timestamp", async function () {
      const tx = await staking.connect(alice).stake(TOKENS_100K);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      const stakes = await staking.getUserStakes(alice.address);
      expect(stakes.length).to.equal(1);
      expect(stakes[0].amount).to.equal(TOKENS_100K);
      expect(stakes[0].owner).to.equal(alice.address);
      expect(stakes[0].startTime).to.equal(BigInt(block.timestamp));
      expect(stakes[0].unlockTime).to.equal(BigInt(block.timestamp + ONE_DAY));
      expect(stakes[0].withdrawn).to.be.false;
      expect(stakes[0].claimed).to.be.false;
    });

    it("Should revert withdraw before 24-hour lock elapses", async function () {
      await staking.connect(alice).stake(TOKENS_100K);

      // Fast forward 23 hours (1 hour short of 24h)
      await time.increase(23 * 3600);

      const stakes = await staking.getUserStakes(alice.address);
      await expect(staking.connect(alice).withdraw(stakes[0].stakeId))
        .to.be.revertedWithCustomError(staking, "StakeStillLocked")
        .withArgs(stakes[0].stakeId, stakes[0].unlockTime);
    });

    it("Should revert claimReward before 24-hour lock elapses", async function () {
      // Deposit rewards
      await staking.connect(owner).depositRewards({ value: ethers.parseEther("1.0") });

      await staking.connect(alice).stake(TOKENS_100K);

      // Fast forward 12 hours
      await time.increase(12 * 3600);

      const stakes = await staking.getUserStakes(alice.address);
      await expect(staking.connect(alice).claimReward(stakes[0].stakeId))
        .to.be.revertedWithCustomError(staking, "StakeStillLocked")
        .withArgs(stakes[0].stakeId, stakes[0].unlockTime);
    });

    it("Should revert if non-owner attempts to withdraw or claim", async function () {
      await staking.connect(alice).stake(TOKENS_100K);
      await time.increase(ONE_DAY + 10);

      const stakes = await staking.getUserStakes(alice.address);
      await expect(staking.connect(bob).withdraw(stakes[0].stakeId))
        .to.be.revertedWithCustomError(staking, "NotStakeOwner");
    });
  });

  describe("4. Dynamic Proportional Distribution (Exact Prompt Example)", function () {
    it("Should distribute rewards proportionally across Alice (10%), Bob (30%), Carol (60%)", async function () {
      // 1. Admin deposits 10 ETH into staking reward pool
      const poolDeposit = ethers.parseEther("10.0");
      await staking.connect(owner).depositRewards({ value: poolDeposit });

      // 2. Users stake simultaneously:
      // Alice = 100,000 $APEBROKE (10%)
      // Bob   = 300,000 $APEBROKE (30%)
      // Carol = 600,000 $APEBROKE (60%)
      // Total = 1,000,000 $APEBROKE
      await staking.connect(alice).stake(TOKENS_100K);
      await staking.connect(bob).stake(TOKENS_300K);
      await staking.connect(carol).stake(TOKENS_600K);

      expect(await staking.totalStaked()).to.equal(TOKENS_1M);

      // 3. Advance time by exactly 24 hours (full period & lock completion)
      await time.increase(ONE_DAY);

      // Verify pending rewards close to 0.1 ETH, 0.3 ETH, 0.6 ETH (10% of 10 ETH = 1 ETH total)
      const aliceStakes = await staking.getUserStakes(alice.address);
      const bobStakes = await staking.getUserStakes(bob.address);
      const carolStakes = await staking.getUserStakes(carol.address);

      const alicePending = await staking.getPendingReward(aliceStakes[0].stakeId);
      const bobPending = await staking.getPendingReward(bobStakes[0].stakeId);
      const carolPending = await staking.getPendingReward(carolStakes[0].stakeId);

      // Check within 0.001 ETH precision
      expect(Number(ethers.formatEther(alicePending))).to.be.closeTo(0.1, 0.005);
      expect(Number(ethers.formatEther(bobPending))).to.be.closeTo(0.3, 0.005);
      expect(Number(ethers.formatEther(carolPending))).to.be.closeTo(0.6, 0.005);

      // 4. Users claim rewards
      const aliceBalBefore = await ethers.provider.getBalance(alice.address);
      const tx = await staking.connect(alice).claimReward(aliceStakes[0].stakeId);
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;
      const aliceBalAfter = await ethers.provider.getBalance(alice.address);

      expect(aliceBalAfter + gasSpent - aliceBalBefore).to.be.closeTo(ethers.parseEther("0.1"), ethers.parseEther("0.005"));

      // 5. Verify claim prevents double-claiming
      await expect(staking.connect(alice).claimReward(aliceStakes[0].stakeId))
        .to.be.revertedWithCustomError(staking, "RewardAlreadyClaimed");
    });

    it("Should naturally decrease the available reward pool in period 2 (10 ETH -> 9 ETH -> 8.1 ETH)", async function () {
      // Period 1: Deposit 10 ETH
      await staking.connect(owner).depositRewards({ value: ethers.parseEther("10.0") });
      await staking.connect(alice).stake(TOKENS_100K);

      // Current period allocated 10% = 1.0 ETH, remaining pool = 9.0 ETH
      let stats = await staking.getStakingStats();
      expect(stats.rewardPoolBalance).to.equal(ethers.parseEther("9.0"));
      expect(stats.currentPeriodReward).to.equal(ethers.parseEther("1.0"));

      // Advance by 24 hours -> triggers period roll
      await time.increase(ONE_DAY);
      await staking.connect(alice).claimReward(1);

      // Period 2: 10% of 9.0 ETH = 0.9 ETH allocated, remaining pool = 8.1 ETH
      stats = await staking.getStakingStats();
      expect(Number(ethers.formatEther(stats.rewardPoolBalance))).to.be.closeTo(8.1, 0.01);
      expect(Number(ethers.formatEther(stats.currentPeriodReward))).to.be.closeTo(0.9, 0.01);
    });
  });

  describe("5. Multiple Staking Positions Per Wallet", function () {
    it("Should maintain independent 24-hour locks and amounts for multiple stakes from same wallet", async function () {
      // Alice creates Stake #1 (100k)
      await staking.connect(alice).stake(TOKENS_100K);

      // 5 hours later, Alice creates Stake #2 (300k)
      await time.increase(5 * 3600);
      await staking.connect(alice).stake(TOKENS_300K);

      const stakes = await staking.getUserStakes(alice.address);
      expect(stakes.length).to.equal(2);
      expect(stakes[0].amount).to.equal(TOKENS_100K);
      expect(stakes[1].amount).to.equal(TOKENS_300K);

      // Advance 20 hours (25 hours after #1, but only 20 hours after #2)
      await time.increase(20 * 3600);

      // Stake #1 is unlocked (25h elapsed) -> can withdraw
      await expect(staking.connect(alice).withdraw(stakes[0].stakeId))
        .to.emit(staking, "Withdrawn")
        .withArgs(stakes[0].stakeId, alice.address, TOKENS_100K);

      // Stake #2 is still locked (only 20h elapsed) -> reverts
      await expect(staking.connect(alice).withdraw(stakes[1].stakeId))
        .to.be.revertedWithCustomError(staking, "StakeStillLocked");

      // Advance remaining 5 hours (25h after #2)
      await time.increase(5 * 3600);

      // Stake #2 can now withdraw
      await expect(staking.connect(alice).withdraw(stakes[1].stakeId))
        .to.emit(staking, "Withdrawn")
        .withArgs(stakes[1].stakeId, alice.address, TOKENS_300K);
    });
  });

  describe("6. Withdrawal & Atomic withdrawAndClaim", function () {
    it("Should withdraw 100% principal and allow withdrawAndClaim in single tx", async function () {
      await staking.connect(owner).depositRewards({ value: ethers.parseEther("5.0") });
      await staking.connect(alice).stake(TOKENS_100K);

      await time.increase(ONE_DAY + 60);

      const balBefore = await token.balanceOf(alice.address);
      const ethBefore = await ethers.provider.getBalance(alice.address);

      const tx = await staking.connect(alice).withdrawAndClaim(1);
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      const balAfter = await token.balanceOf(alice.address);
      const ethAfter = await ethers.provider.getBalance(alice.address);

      // Token principal fully returned
      expect(balAfter - balBefore).to.equal(TOKENS_100K);
      // ETH rewards claimed
      expect(ethAfter + gasSpent).to.be.gt(ethBefore);

      // Cannot withdraw again
      await expect(staking.connect(alice).withdraw(1))
        .to.be.revertedWithCustomError(staking, "AlreadyWithdrawn");
    });
  });

  describe("7. Admin Controls, Bounds & Solvency", function () {
    it("Should allow admin to update reward rate within safety bounds", async function () {
      await expect(staking.connect(owner).setRewardRateBps(1500))
        .to.emit(staking, "RewardRateUpdated")
        .withArgs(1000, 1500);

      expect(await staking.rewardRateBps()).to.equal(1500n);

      // Revert if > 50% (5000 bps)
      await expect(staking.connect(owner).setRewardRateBps(5500))
        .to.be.revertedWithCustomError(staking, "ExceedsMaxRewardRateBps");

      // Revert if < 1% (100 bps)
      await expect(staking.connect(owner).setRewardRateBps(50))
        .to.be.revertedWithCustomError(staking, "BelowMinRewardRateBps");
    });

    it("Should pause and unpause staking", async function () {
      await staking.connect(owner).pauseStaking();

      await expect(staking.connect(alice).stake(TOKENS_100K))
        .to.be.revertedWithCustomError(staking, "EnforcedPause");

      await staking.connect(owner).unpauseStaking();
      await expect(staking.connect(alice).stake(TOKENS_100K))
        .to.emit(staking, "Staked");
    });

    it("Should reject direct ETH transfers outside depositRewards", async function () {
      await expect(
        owner.sendTransaction({
          to: stakingAddress,
          value: ethers.parseEther("1.0"),
        })
      ).to.be.revertedWithCustomError(staking, "DirectEthNotAllowed");
    });

    it("Should prevent admin from recovering staked $APEBROKE principal", async function () {
      await staking.connect(alice).stake(TOKENS_100K);

      await expect(
        staking.connect(owner).recoverNonStakingTokens(await token.getAddress(), TOKENS_100K)
      ).to.be.revertedWithCustomError(staking, "CannotRecoverStakedToken");
    });
  });
});
