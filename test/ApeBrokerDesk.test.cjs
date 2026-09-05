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
  const BASE_BOOST_COST = 699_386n * ONE_TOKEN;
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

    it("Should calculate exponential boost costs correctly: 1x, 2x, 4x, 8x, 16x", async function () {
      expect(await desk.getBoostCost(1)).to.equal(BASE_BOOST_COST * 1n);
      expect(await desk.getBoostCost(2)).to.equal(BASE_BOOST_COST * 2n);
      expect(await desk.getBoostCost(3)).to.equal(BASE_BOOST_COST * 4n);
      expect(await desk.getBoostCost(4)).to.equal(BASE_BOOST_COST * 8n);
      expect(await desk.getBoostCost(5)).to.equal(BASE_BOOST_COST * 16n);
    });

    it("Should apply boosts 1 through 5, scaling weights deterministically", async function () {
      // Boost 1: cost 1x (10k), weight becomes 200 (Base x 2)
      await expect(desk.connect(alice).boostDesk(1))
        .to.emit(desk, "DeskBoosted")
        .withArgs(1, alice.address, 1, BASE_BOOST_COST * 1n, 200n);
      expect(await desk.getBoostCount(1)).to.equal(1);
      expect(await desk.getDeskWeight(1)).to.equal(200n);
      expect(await desk.totalEligibleWeight()).to.equal(200n);

      // Boost 2: cost 2x (20k), weight becomes 300 (Base x 3)
      await desk.connect(alice).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(2);
      expect(await desk.getDeskWeight(1)).to.equal(300n);

      // Boost 3: cost 4x (40k), weight becomes 400 (Base x 4)
      await desk.connect(alice).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(3);
      expect(await desk.getDeskWeight(1)).to.equal(400n);

      // Boost 4: cost 8x (80k), weight becomes 500 (Base x 5)
      await desk.connect(alice).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(4);
      expect(await desk.getDeskWeight(1)).to.equal(500n);

      // Boost 5: cost 16x (160k), weight becomes 600 (Base x 6)
      await desk.connect(alice).boostDesk(1);
      expect(await desk.getBoostCount(1)).to.equal(5);
      expect(await desk.getDeskWeight(1)).to.equal(600n);
      expect(await desk.totalEligibleWeight()).to.equal(600n);

      // Verify total boost fees collected = 699,386 * (1 + 2 + 4 + 8 + 16) = 21,680,966 tokens
      const expectedTotalBoost = 21_680_966n * ONE_TOKEN;
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

  describe("4. Native ETH Reward Pool & O(1) Distribution", function () {
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

    it("Should distribute ETH proportionally to Desk Weight", async function () {
      expect(await desk.totalEligibleWeight()).to.equal(300n);

      // Admin deposits 3 ETH rewards
      const depositAmount = ethers.parseEther("3.0");
      await expect(desk.connect(admin).depositRewards({ value: depositAmount }))
        .to.emit(desk, "RewardsDeposited");

      // Alice (100/300 = 1/3) should have 1.0 ETH pending
      // Bob (200/300 = 2/3) should have 2.0 ETH pending
      const alicePending = await desk.getPendingRewards(1);
      const bobPending = await desk.getPendingRewards(3);

      expect(alicePending).to.equal(ethers.parseEther("1.0"));
      expect(bobPending).to.equal(ethers.parseEther("2.0"));
    });

    it("Should allow claiming and accurately track balances", async function () {
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("3.0") });

      const aliceEthBefore = await ethers.provider.getBalance(alice.address);
      const tx = await desk.connect(alice).claimRewards(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const aliceEthAfter = await ethers.provider.getBalance(alice.address);
      expect(aliceEthAfter).to.equal(aliceEthBefore + ethers.parseEther("1.0") - gasUsed);

      // Attempting to claim again should revert
      await expect(desk.connect(alice).claimRewards(1))
        .to.be.revertedWithCustomError(desk, "NoRewardsToClaim");
    });

    it("Should support claimAllRewards for a user owning multiple Desks", async function () {
      const deskAddress = await desk.getAddress();
      // Alice activates Desk 2 as well
      await desk.connect(alice).activateDesk(2);
      // Weights: Desk 1 (100), Desk 2 (100), Desk 3 (200) -> Total 400
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("4.0") });

      // Alice owns Desk 1 (1 ETH) and Desk 2 (1 ETH) -> 2 ETH total
      const aliceEthBefore = await ethers.provider.getBalance(alice.address);
      const tx = await desk.connect(alice).claimAllRewards([1, 2]);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const aliceEthAfter = await ethers.provider.getBalance(alice.address);
      expect(aliceEthAfter).to.equal(aliceEthBefore + ethers.parseEther("2.0") - gasUsed);
    });

    it("Should ensure boosting after reward accrual does not grant retroactive rewards", async function () {
      // 1 ETH deposited while Alice has 100 weight, Bob has 200 weight (total 300)
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("3.0") });
      // Alice earned 1 ETH, Bob earned 2 ETH

      // Alice now boosts to 200 weight
      await desk.connect(alice).boostDesk(1);
      // Alice's pending for the first period must remain 1 ETH!
      expect(await desk.getPendingRewards(1)).to.equal(ethers.parseEther("1.0"));

      // Admin deposits another 4 ETH. Total weight is now 200 + 200 = 400
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("4.0") });
      // Alice earns 200/400 of 4 ETH = 2 ETH in second period.
      // Total for Alice = 1.0 + 2.0 = 3.0 ETH
      expect(await desk.getPendingRewards(1)).to.equal(ethers.parseEther("3.0"));
    });

    it("Should safely hold deposits if no Desks are active and roll over to first activation", async function () {
      // Deploy fresh contract with no activated desks
      const ApeBrokerDesk = await ethers.getContractFactory("ApeBrokerDesk");
      const freshDesk = await ApeBrokerDesk.deploy(
        await token.getAddress(),
        await nft.getAddress(),
        admin.address,
        treasury.address,
        BASE_BOOST_COST,
        BASE_DESK_WEIGHT
      );
      await freshDesk.waitForDeployment();

      // Admin deposits 1 ETH before any desk is active
      await freshDesk.connect(admin).depositRewards({ value: ethers.parseEther("1.0") });
      expect(await freshDesk.undistributedRewardRemainder()).to.equal(ethers.parseEther("1.0"));

      // Charlie activates Desk 4
      await token.connect(charlie).approve(await freshDesk.getAddress(), ACTIVATION_FEE);
      await freshDesk.connect(charlie).activateDesk(4);

      // Next deposit of 1 ETH triggers distribution of 1 + 1 = 2 ETH to Charlie
      await freshDesk.connect(admin).depositRewards({ value: ethers.parseEther("1.0") });
      expect(await freshDesk.getPendingRewards(4)).to.equal(ethers.parseEther("2.0"));
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
      expect(aliceEthAfter).to.equal(aliceEthBefore + ethers.parseEther("1.0") - gasUsed);

      // Deposit another 2 ETH while Bob is the owner
      await desk.connect(admin).depositRewards({ value: ethers.parseEther("2.0") });

      // Bob can now claim the 2 ETH that accrued after he became owner
      const bobEthBefore = await ethers.provider.getBalance(bob.address);
      const bobTx = await desk.connect(bob).claimRewards(1);
      const bobReceipt = await bobTx.wait();
      const bobGas = bobReceipt.gasUsed * bobReceipt.gasPrice;

      const bobEthAfter = await ethers.provider.getBalance(bob.address);
      expect(bobEthAfter).to.equal(bobEthBefore + ethers.parseEther("2.0") - bobGas);
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
