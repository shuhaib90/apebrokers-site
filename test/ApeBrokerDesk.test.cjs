const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ApeBrokerDesk - Full Production Test Suite", function () {
  let token;
  let nft;
  let desk;
  let owner, admin, treasury, alice, bob, charlie;

  const DECIMALS = 18n;
  const ONE_TOKEN = 10n ** DECIMALS;
  const ACTIVATION_FEE = 349_693n * ONE_TOKEN;
  const BASE_BOOST_COST = 349_693n * ONE_TOKEN;
  const BASE_DESK_WEIGHT = 100n;

  beforeEach(async function () {
    [owner, admin, treasury, alice, bob, charlie] = await ethers.getSigners();

    // Deploy Mock ERC20 ($APEBROKE)
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("ApeBroke Token", "APEBROKE", 18);
    await token.waitForDeployment();

    // Deploy Mock ERC721 (Ape Broker NFT)
    const MockERC721 = await ethers.getContractFactory("MockERC721");
    nft = await MockERC721.deploy("Ape Broker NFT", "APEBRK");
    await nft.waitForDeployment();

    // Deploy ApeBrokerDesk contract
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

    // Mint NFTs
    await nft.mint(alice.address, 1);
    await nft.mint(alice.address, 2);
    await nft.mint(bob.address, 3);
    await nft.mint(charlie.address, 4);

    // Mint $APEBROKE tokens (30M to cover max 5 boosts + activations)
    await token.mint(alice.address, 30_000_000n * ONE_TOKEN);
    await token.mint(bob.address, 30_000_000n * ONE_TOKEN);
    await token.mint(charlie.address, 30_000_000n * ONE_TOKEN);
  });

  describe("1. Deployment & Configuration", function () {
    it("Should initialize with correct addresses and parameters", async function () {
      expect(await desk.apeBrokeToken()).to.equal(await token.getAddress());
      expect(await desk.apeBrokerNft()).to.equal(await nft.getAddress());
      expect(await desk.owner()).to.equal(admin.address);
      expect(await desk.treasury()).to.equal(treasury.address);
      expect(await desk.activationFee()).to.equal(ACTIVATION_FEE);
      expect(await desk.baseBoostCost()).to.equal(BASE_BOOST_COST);
      expect(await desk.baseDeskWeight()).to.equal(BASE_DESK_WEIGHT);
      expect(await desk.MAX_BOOSTS()).to.equal(5);
      expect(await desk.EPOCH_DURATION()).to.equal(18000n);
    });

    it("Should revert deployment if zero addresses are provided", async function () {
      const ApeBrokerDesk = await ethers.getContractFactory("ApeBrokerDesk");
      await expect(
        ApeBrokerDesk.deploy(
          ethers.ZeroAddress,
          await nft.getAddress(),
          admin.address,
          treasury.address,
          BASE_BOOST_COST,
          BASE_DESK_WEIGHT
        )
      ).to.be.revertedWithCustomError(desk, "ZeroAddress");
    });
  });

  describe("2. Desk Activation (1 NFT = 1 Desk)", function () {
    it("Should activate a Desk successfully with exact 349,693 APEBROKE fee", async function () {
      const deskAddress = await desk.getAddress();
      await token.connect(alice).approve(deskAddress, ACTIVATION_FEE);

      await expect(desk.connect(alice).activateDesk(1))
        .to.emit(desk, "DeskActivated")
        .withArgs(1, alice.address, ACTIVATION_FEE, BASE_DESK_WEIGHT);

      expect(await desk.isDeskActive(1)).to.be.true;
      expect(await desk.getDeskWeight(1)).to.equal(BASE_DESK_WEIGHT);
      expect(await desk.getBoostCount(1)).to.equal(0);
      expect(await desk.totalEligibleWeight()).to.equal(BASE_DESK_WEIGHT);
      expect(await desk.totalActivationFeesCollected()).to.equal(ACTIVATION_FEE);
      expect(await desk.getProtocolFeeBalance()).to.equal(ACTIVATION_FEE);
      expect(await token.balanceOf(deskAddress)).to.equal(ACTIVATION_FEE);
    });

    it("Should revert if caller does not own the NFT", async function () {
      const deskAddress = await desk.getAddress();
      await token.connect(bob).approve(deskAddress, ACTIVATION_FEE);

      await expect(desk.connect(bob).activateDesk(1))
        .to.be.revertedWithCustomError(desk, "NotTokenOwner");
    });

    it("Should revert if Desk is already active", async function () {
      const deskAddress = await desk.getAddress();
      await token.connect(alice).approve(deskAddress, ACTIVATION_FEE * 2n);
      await desk.connect(alice).activateDesk(1);

      await expect(desk.connect(alice).activateDesk(1))
        .to.be.revertedWithCustomError(desk, "DeskAlreadyActive");
    });

    it("Should revert if user has insufficient allowance", async function () {
      const deskAddress = await desk.getAddress();
      await token.connect(alice).approve(deskAddress, ACTIVATION_FEE - 1n);

      await expect(desk.connect(alice).activateDesk(1))
        .to.be.reverted;
    });

    it("Should revert if user has insufficient balance", async function () {
      const [, , , , , , poorUser] = await ethers.getSigners();
      await nft.mint(poorUser.address, 99);
      const deskAddress = await desk.getAddress();
      await token.connect(poorUser).approve(deskAddress, ACTIVATION_FEE);

      await expect(desk.connect(poorUser).activateDesk(99))
        .to.be.reverted;
    });

    it("Should enforce maximum 5 active Desks per wallet limit", async function () {
      const deskAddress = await desk.getAddress();
      // Mint 4 more NFTs to Alice (so Alice has NFTs 1, 2, 5, 6, 7, 8)
      await nft.mint(alice.address, 5);
      await nft.mint(alice.address, 6);
      await nft.mint(alice.address, 7);
      await nft.mint(alice.address, 8);

      await token.connect(alice).approve(deskAddress, ACTIVATION_FEE * 10n);

      // Alice activates 5 Desks: 1, 2, 5, 6, 7
      await desk.connect(alice).activateDesk(1);
      await desk.connect(alice).activateDesk(2);
      await desk.connect(alice).activateDesk(5);
      await desk.connect(alice).activateDesk(6);
      await desk.connect(alice).activateDesk(7);

      expect(await desk.getActiveDeskCount(alice.address)).to.equal(5n);

      // Alice attempts to activate a 6th Desk -> reverts with MaxDesksPerWalletReached
      await expect(desk.connect(alice).activateDesk(8))
        .to.be.revertedWithCustomError(desk, "MaxDesksPerWalletReached");

      // Alice transfers Desk 1 to Bob
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1);
      await desk.checkpointDesk(1);

      // Alice active desk count reduces to 4, Bob becomes 1
      expect(await desk.getActiveDeskCount(alice.address)).to.equal(4n);
      expect(await desk.getActiveDeskCount(bob.address)).to.equal(1n);

      // Alice can now activate her 5th desk (Desk 8)
      await desk.connect(alice).activateDesk(8);
      expect(await desk.getActiveDeskCount(alice.address)).to.equal(5n);
    });
  });

  describe("3. Boost System (Costs, Weights, 5 Max Cap)", function () {
    beforeEach(async function () {
      const deskAddress = await desk.getAddress();
      await token.connect(alice).approve(deskAddress, ethers.MaxUint256);
      await desk.connect(alice).activateDesk(1);
    });

    it("Should calculate linear boost costs correctly: 2x, 4x, 6x, 8x, 10x", async function () {
      expect(await desk.getBoostCost(1)).to.equal(BASE_BOOST_COST * 2n);
      expect(await desk.getBoostCost(2)).to.equal(BASE_BOOST_COST * 4n);
      expect(await desk.getBoostCost(3)).to.equal(BASE_BOOST_COST * 6n);
      expect(await desk.getBoostCost(4)).to.equal(BASE_BOOST_COST * 8n);
      expect(await desk.getBoostCost(5)).to.equal(BASE_BOOST_COST * 10n);
    });

    it("Should apply boosts 1 through 5, scaling weights deterministically", async function () {
      // Boost 1: cost 2x (699,386), weight becomes 200 (Base x 2)
      await expect(desk.connect(alice).boostDesk(1))
        .to.emit(desk, "DeskBoosted")
        .withArgs(1, alice.address, 1, BASE_BOOST_COST * 2n, 200n);
      expect(await desk.getBoostCount(1)).to.equal(1);
      expect(await desk.getDeskWeight(1)).to.equal(200n);
      expect(await desk.totalEligibleWeight()).to.equal(200n);

      // Boost 2: cost 4x (1,398,772), weight becomes 300 (Base x 3)
      await desk.connect(alice).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(2);
      expect(await desk.getDeskWeight(1)).to.equal(300n);

      // Boost 3: cost 6x (2,098,158), weight becomes 400 (Base x 4)
      await desk.connect(alice).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(3);
      expect(await desk.getDeskWeight(1)).to.equal(400n);

      // Boost 4: cost 8x (2,797,544), weight becomes 500 (Base x 5)
      await desk.connect(alice).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(4);
      expect(await desk.getDeskWeight(1)).to.equal(500n);

      // Boost 5: cost 10x (3,496,930), weight becomes 600 (Base x 6)
      await desk.connect(alice).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(5);
      expect(await desk.getDeskWeight(1)).to.equal(600n);
      expect(await desk.totalEligibleWeight()).to.equal(600n);

      // Verify total boost fees collected = 349,693 * (2 + 4 + 6 + 8 + 10) = 10,490,790 tokens
      const expectedTotalBoost = 10_490_790n * ONE_TOKEN;
      expect(await desk.totalBoostFeesCollected()).to.equal(expectedTotalBoost);
    });

    it("Should revert on the 6th boost (hard limit of 5)", async function () {
      for (let i = 1; i <= 5; i++) {
        await desk.connect(alice).boostDesk(1);
      }
      await expect(desk.connect(alice).boostDesk(1))
        .to.be.revertedWithCustomError(desk, "MaxBoostsReached");
    });

    it("Should revert if boosting an inactive Desk", async function () {
      await expect(desk.connect(alice).boostDesk(2))
        .to.be.revertedWithCustomError(desk, "DeskNotActive");
    });

    it("Should revert if non-owner tries to boost", async function () {
      await expect(desk.connect(bob).boostDesk(1))
        .to.be.revertedWithCustomError(desk, "NotTokenOwner");
    });
  });

  describe("4. Safe & Fair Dynamic 3-Factor Distribution Engine", function () {
    beforeEach(async function () {
      const deskAddress = await desk.getAddress();
      await token.connect(alice).approve(deskAddress, ethers.MaxUint256);
      await token.connect(bob).approve(deskAddress, ethers.MaxUint256);

      // Alice activates Desk 1 (100 wt)
      await desk.connect(alice).activateDesk(1);
      // Bob activates Desk 3 (100 wt) and boosts once (200 wt)
      await desk.connect(bob).activateDesk(3);
      await desk.connect(bob).boostDesk(3);

      // Total weight = 100 + 200 = 300 wt
    });

    it("Should distribute ETH proportionally to Desk Weight without wiping out pool", async function () {
      expect(await desk.totalEligibleWeight()).to.equal(300n);

      // Admin deposits 1.0 ETH rewards
      const depositAmount = ethers.parseEther("1.0");
      await expect(desk.connect(admin).depositRewards({ value: depositAmount }))
        .to.emit(desk, "RewardsDeposited");

      // Math verification:
      // Pool = 1.0 ETH
      // Epoch rate = 5% (500 bps) -> 0.05 ETH distributable
      // Benchmark floor = 2000 WGT (since active weight 300 < 2000)
      // Added reward per weight = 0.05 ETH / 2000 = 0.000025 ETH / WGT
      // Alice (100 WGT) receives: 0.0025 ETH
      // Bob (200 WGT) receives: 0.0050 ETH (2x boost return!)
      const alicePending = await desk.getPendingRewards(1);
      const bobPending = await desk.getPendingRewards(3);

      expect(alicePending).to.equal(ethers.parseEther("0.0025"));
      expect(bobPending).to.equal(ethers.parseEther("0.0050"));

      // Total distributed to the 2 desks is 0.0075 ETH.
      // Remaining pool must be 0.9925 ETH (>99% safe in pool!)
      const availablePool = await desk.getAvailableRewardPool();
      expect(availablePool).to.equal(ethers.parseEther("0.9925"));
    });

    it("Should allow claiming and accurately track balances", async function () {
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("1.0") });

      const aliceEthBefore = await ethers.provider.getBalance(alice.address);
      const tx = await desk.connect(alice).claimRewards(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const aliceEthAfter = await ethers.provider.getBalance(alice.address);
      expect(aliceEthAfter).to.equal(aliceEthBefore + ethers.parseEther("0.0025") - gasUsed);

      // Attempting to claim again should revert
      await expect(desk.connect(alice).claimRewards(1))
        .to.be.revertedWithCustomError(desk, "NoRewardsToClaim");
    });

    it("Should support claimAllRewards for a user owning multiple Desks", async function () {
      // Alice activates Desk 2 as well
      await desk.connect(alice).activateDesk(2);
      // Alice now has Desk 1 (100 wt) and Desk 2 (100 wt), Bob has Desk 3 (200 wt)
      // Total weight = 400 wt
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("1.0") });

      // Alice owns Desk 1 (0.0025 ETH) and Desk 2 (0.0025 ETH) -> 0.0050 ETH total
      const aliceEthBefore = await ethers.provider.getBalance(alice.address);
      const tx = await desk.connect(alice).claimAllRewards([1, 2]);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const aliceEthAfter = await ethers.provider.getBalance(alice.address);
      expect(aliceEthAfter).to.equal(aliceEthBefore + ethers.parseEther("0.0050") - gasUsed);
    });

    it("Should distribute next epoch rewards when time advances by 5 hours", async function () {
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("1.0") });

      // After first epoch distribution: Alice has 0.0025 ETH
      expect(await desk.getPendingRewards(1)).to.equal(ethers.parseEther("0.0025"));

      // Advance time by 5 hours (18,000 seconds)
      await ethers.provider.send("evm_increaseTime", [18000]);
      await ethers.provider.send("evm_mine");

      // Anyone can trigger distributeEpochRewards
      await desk.distributeEpochRewards();

      // Second epoch distributed from the remaining 0.9925 ETH pool:
      // 5% of 0.9925 ETH = 0.049625 ETH
      // Per weight unit = 0.049625 / 2000 = 0.0000248125 ETH
      // Alice (100 WGT) gets 0.00248125 ETH more
      // Total pending for Alice is approximately 0.0025 + 0.00248125 = 0.00498125 ETH
      const alicePendingEpoch2 = await desk.getPendingRewards(1);
      expect(alicePendingEpoch2).to.be.gt(ethers.parseEther("0.0049"));
    });

    it("Should allow admin to configure emission rate and benchmark floor with safety limits", async function () {
      // Admin sets emission to 10% (1000 bps)
      await desk.connect(admin).setEpochEmissionBps(1000);
      const [emissionBps, benchmarkWeight] = await desk.getDistributionParameters();
      expect(emissionBps).to.equal(1000n);

      // Reverts if > 20% (2000 bps)
      await expect(desk.connect(admin).setEpochEmissionBps(2001))
        .to.be.revertedWithCustomError(desk, "ExceedsMaxEmissionBps");

      // Admin updates benchmark floor
      await desk.connect(admin).setBenchmarkWeightFloor(1500);
      const [, newBenchmark] = await desk.getDistributionParameters();
      expect(newBenchmark).to.equal(1500n);

      // Non-owner cannot update
      await expect(desk.connect(alice).setEpochEmissionBps(500))
        .to.be.revertedWithCustomError(desk, "OwnableUnauthorizedAccount");
    });
  });

  describe("5. NFT Transfer Accounting (Historical Rewards Preserved)", function () {
    beforeEach(async function () {
      const deskAddress = await desk.getAddress();
      await token.connect(alice).approve(deskAddress, ethers.MaxUint256);
      await desk.connect(alice).activateDesk(1);

      // Deposit 1 ETH while Alice is the owner
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("1.0") });
    });

    it("Should preserve Alice's accrued rewards when NFT is transferred to Bob", async function () {
      // Alice transfers NFT 1 to Bob
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1);

      // Bob checks his pending rewards for Desk 1 -> should be 0
      expect(await desk.connect(bob).getPendingRewards(1)).to.equal(0n);

      // Bob tries to claim Desk 1 rewards -> should revert because Bob hasn't accrued any rewards yet
      await expect(desk.connect(bob).claimRewards(1))
        .to.be.revertedWithCustomError(desk, "NoRewardsToClaim");

      // Alice claims her historical rewards accrued prior to transfer using claimHistoricalRewardsForDesks
      const aliceEthBefore = await ethers.provider.getBalance(alice.address);
      const tx = await desk.connect(alice).claimHistoricalRewardsForDesks([1]);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const aliceEthAfter = await ethers.provider.getBalance(alice.address);
      expect(aliceEthAfter).to.equal(aliceEthBefore + ethers.parseEther("0.0025") - gasUsed);
    });

    it("Should keep boost state with the Desk across NFT transfers", async function () {
      // Alice boosts Desk 1 twice
      await desk.connect(alice).boostDesk(1);
      await desk.connect(alice).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(2);
      expect(await desk.getDeskWeight(1)).to.equal(300n);

      // Transfer to Bob
      await nft.connect(alice).transferFrom(alice.address, bob.address, 1);

      // Desk retains boost count = 2 and weight = 300
      expect(await desk.getBoostCount(1)).to.equal(2);
      expect(await desk.getDeskWeight(1)).to.equal(300n);

      // Bob can boost the 3rd time
      const deskAddress = await desk.getAddress();
      await token.connect(bob).approve(deskAddress, ethers.MaxUint256);
      await desk.connect(bob).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(3);
      expect(await desk.getDeskWeight(1)).to.equal(400n);
    });
  });

  describe("6. Admin Operations & Protocol Fee Isolation", function () {
    beforeEach(async function () {
      const deskAddress = await desk.getAddress();
      await token.connect(alice).approve(deskAddress, ethers.MaxUint256);
      await desk.connect(alice).activateDesk(1);
      await desk.connect(alice).boostDesk(1);
      // Activation fee: 349,693; Boost fee: 699,386 -> Total: 1,049,079 APEBROKE
    });

    it("Should allow admin to claim protocol fees to treasury in $APEBROKE only", async function () {
      const totalFees = 1_049_079n * ONE_TOKEN;
      expect(await desk.getProtocolFeeBalance()).to.equal(totalFees);

      await expect(desk.connect(admin).claimProtocolFees(totalFees))
        .to.emit(desk, "ProtocolFeesClaimed")
        .withArgs(treasury.address, totalFees);

      expect(await token.balanceOf(treasury.address)).to.equal(totalFees);
      expect(await desk.getProtocolFeeBalance()).to.equal(0n);
    });

    it("Should revert if non-admin attempts to claim protocol fees", async function () {
      await expect(desk.connect(alice).claimProtocolFees(1000n))
        .to.be.revertedWithCustomError(desk, "OwnableUnauthorizedAccount");
    });

    it("Should revert if admin attempts to claim more fees than available", async function () {
      const excessive = 2_000_000n * ONE_TOKEN;
      await expect(desk.connect(admin).claimProtocolFees(excessive))
        .to.be.revertedWithCustomError(desk, "ExceedsCollectedFees");
    });

    it("Should strictly isolate $APEBROKE fee balance from ETH rewards", async function () {
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("5.0") });

      // ETH balance must remain 5.0 ETH
      expect(await desk.getRewardPoolBalance()).to.equal(ethers.parseEther("5.0"));

      // Admin claims APEBROKE
      await desk.connect(admin).claimProtocolFees(100_000n * ONE_TOKEN);

      // ETH reward pool is completely unaffected!
      expect(await desk.getRewardPoolBalance()).to.equal(ethers.parseEther("5.0"));
    });

    it("Should reject accidental native ETH transfers outside depositRewards", async function () {
      await expect(
        alice.sendTransaction({
          to: await desk.getAddress(),
          value: ethers.parseEther("1.0"),
        })
      ).to.be.revertedWithCustomError(desk, "DirectEthNotAllowed");
    });

    it("Should allow updating treasury address with event emission", async function () {
      await expect(desk.connect(admin).setTreasury(charlie.address))
        .to.emit(desk, "TreasuryUpdated")
        .withArgs(treasury.address, charlie.address);
      expect(await desk.treasury()).to.equal(charlie.address);
    });
  });

  describe("7. Epoch Calculation Views", function () {
    it("Should calculate 5-hour epochs and remaining time correctly", async function () {
      expect(await desk.currentEpoch()).to.equal(0n);
      const timeRemaining = await desk.timeUntilNextEpoch();
      expect(timeRemaining).to.be.lte(18000n);

      // Fast-forward time by 5 hours
      await ethers.provider.send("evm_increaseTime", [18000]);
      await ethers.provider.send("evm_mine");

      expect(await desk.currentEpoch()).to.equal(1n);
    });
  });
});
