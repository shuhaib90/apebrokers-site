const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("ApeBrokerLuckyDraw - Comprehensive Contract Test Suite", function () {
  let token, nft, luckyDraw;
  let owner, alice, bob, carol, nonHolder, treasury;
  let drawAddress;

  const TICKET_PRICE = ethers.parseEther("50000"); // 50,000 $APE
  const ONE_DAY = 24 * 60 * 60;

  beforeEach(async function () {
    [owner, alice, bob, carol, nonHolder, treasury] = await ethers.getSigners();

    // Deploy Mocks
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    token = await MockERC20.deploy("ApeBroke", "APEBROKE", 18);
    await token.waitForDeployment();

    const MockERC721 = await ethers.getContractFactory("MockERC721");
    nft = await MockERC721.deploy("Ape Broker NFT", "ABNFT");
    await nft.waitForDeployment();

    // Deploy ApeBrokerLuckyDraw
    const ApeBrokerLuckyDraw = await ethers.getContractFactory("ApeBrokerLuckyDraw");
    luckyDraw = await ApeBrokerLuckyDraw.deploy(
      await token.getAddress(),
      await nft.getAddress(),
      owner.address
    );
    await luckyDraw.waitForDeployment();
    drawAddress = await luckyDraw.getAddress();

    // Mint tokens
    await token.mint(alice.address, ethers.parseEther("5000000"));
    await token.mint(bob.address, ethers.parseEther("5000000"));
    await token.mint(carol.address, ethers.parseEther("5000000"));
    await token.mint(nonHolder.address, ethers.parseEther("5000000"));

    // Approve tokens
    await token.connect(alice).approve(drawAddress, ethers.MaxUint256);
    await token.connect(bob).approve(drawAddress, ethers.MaxUint256);
    await token.connect(carol).approve(drawAddress, ethers.MaxUint256);
    await token.connect(nonHolder).approve(drawAddress, ethers.MaxUint256);

    // Give Alice, Bob, and Carol Ape Broker NFTs (Alice=1, Bob=2, Carol=3)
    await nft.mint(alice.address, 1);
    await nft.mint(bob.address, 2);
    await nft.mint(bob.address, 3);
    await nft.mint(carol.address, 4);
    await nft.mint(carol.address, 5);
    await nft.mint(carol.address, 6);
    // nonHolder has 0 NFTs
  });

  describe("Draw Creation", function () {
    it("Should allow admin to create custom lucky draws", async function () {
      const tx = await luckyDraw.createDraw({
        title: "Sony PlayStation 5 Disc Edition",
        prizeDescription: "Brand new PS5 console with dual controllers",
        prizeCategory: 0, // PHYSICAL
        imageUrl: "https://example.com/ps5.png",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 100,
        maxTicketsPerWallet: 10,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 1,
      });

      await expect(tx).to.emit(luckyDraw, "DrawCreated");

      const draw = await luckyDraw.getDraw(1);
      expect(draw.title).to.equal("Sony PlayStation 5 Disc Edition");
      expect(draw.ticketPriceApe).to.equal(TICKET_PRICE);
      expect(draw.maxTickets).to.equal(100);
      expect(draw.maxTicketsPerWallet).to.equal(10);
      expect(draw.minNftRequired).to.equal(1);
      expect(draw.winnerCount).to.equal(1);
      expect(draw.status).to.equal(0); // ACTIVE
      expect(draw.totalTicketsSold).to.equal(0);
      expect(await luckyDraw.totalDrawsCount()).to.equal(1);
    });

    it("Should revert if non-admin attempts to create a draw", async function () {
      await expect(
        luckyDraw.connect(alice).createDraw({
          title: "Unauthorized Draw",
          prizeDescription: "None",
          prizeCategory: 0,
          imageUrl: "",
          ticketPriceApe: TICKET_PRICE,
          maxTickets: 100,
          maxTicketsPerWallet: 10,
          minNftRequired: 1,
          durationSeconds: ONE_DAY,
          winnerCount: 1,
        })
      ).to.be.revertedWithCustomError(luckyDraw, "OwnableUnauthorizedAccount");
    });
  });

  describe("NFT Gating & Ticket Purchases", function () {
    beforeEach(async function () {
      await luckyDraw.createDraw({
        title: "PS5 Draw",
        prizeDescription: "PS5 Console",
        prizeCategory: 0,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 20,
        maxTicketsPerWallet: 5,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 1,
      });
    });

    it("Should strictly revert if user has 0 Ape Broker NFTs", async function () {
      await expect(
        luckyDraw.connect(nonHolder).buyTickets(1, 1)
      ).to.be.revertedWithCustomError(luckyDraw, "InsufficientNftBalance");
    });

    it("Should allow verified NFT holders to buy tickets and update balances", async function () {
      // Alice buys 3 tickets
      const tx = await luckyDraw.connect(alice).buyTickets(1, 3);
      await expect(tx)
        .to.emit(luckyDraw, "TicketsPurchased")
        .withArgs(1, alice.address, 3, TICKET_PRICE * 3n, 3, 3);

      expect(await luckyDraw.getUserTickets(1, alice.address)).to.equal(3);
      const draw = await luckyDraw.getDraw(1);
      expect(draw.totalTicketsSold).to.equal(3);
      expect(draw.totalRevenueCollected).to.equal(TICKET_PRICE * 3n);

      // Contract received the tokens
      expect(await token.balanceOf(drawAddress)).to.equal(TICKET_PRICE * 3n);
    });

    it("Should enforce per-wallet ticket limits", async function () {
      await luckyDraw.connect(alice).buyTickets(1, 5); // Max allowed is 5
      await expect(
        luckyDraw.connect(alice).buyTickets(1, 1)
      ).to.be.revertedWithCustomError(luckyDraw, "MaxTicketsPerWalletExceeded");
    });

    it("Should enforce total max tickets limit", async function () {
      await luckyDraw.connect(alice).buyTickets(1, 5);
      await luckyDraw.connect(bob).buyTickets(1, 5);
      await luckyDraw.connect(carol).buyTickets(1, 5);
      // Total is 15 of 20
      await expect(
        luckyDraw.connect(carol).buyTickets(1, 6) // Exceeds 20
      ).to.be.revertedWithCustomError(luckyDraw, "MaxTicketsExceeded");
    });
  });

  describe("Winner Selection Modes (Random vs Manual)", function () {
    beforeEach(async function () {
      await luckyDraw.createDraw({
        title: "Ape Broker Syndicate Draw",
        prizeDescription: "1 ETH or PS5",
        prizeCategory: 0,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 50,
        maxTicketsPerWallet: 20,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 1,
      });

      // Alice buys 2 tickets, Bob buys 3 tickets
      await luckyDraw.connect(alice).buyTickets(1, 2);
      await luckyDraw.connect(bob).buyTickets(1, 3);
    });

    it("Mode 1: Should select random winner and record permanently on-chain", async function () {
      const tx = await luckyDraw.selectWinnerRandom(1);
      await expect(tx).to.emit(luckyDraw, "WinnersSelected");
      await expect(tx).to.emit(luckyDraw, "WinnerSelected");

      const draw = await luckyDraw.getDraw(1);
      expect(draw.status).to.equal(2); // WINNER_SELECTED
      expect(draw.selectionMode).to.equal(1); // RANDOM
      expect(draw.winningTicketId).to.be.gt(0);
      expect([alice.address, bob.address]).to.include(draw.winner);
      expect(draw.selectedByAdmin).to.equal(owner.address);
      expect(draw.prizeStatus).to.equal(0); // PENDING

      const winners = await luckyDraw.getDrawWinners(1);
      expect(winners.length).to.equal(1);
      expect(winners[0]).to.equal(draw.winner);
    });

    it("Mode 1 (Multi-Winner): Should select multiple unique winners randomly", async function () {
      // Create draw with winnerCount: 3
      await luckyDraw.createDraw({
        title: "Multi-Winner Draw",
        prizeDescription: "Top 3 get Ledger Hardware Wallets",
        prizeCategory: 0,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 50,
        maxTicketsPerWallet: 20,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 3,
      });

      // Alice, Bob, and Carol all buy tickets in draw #2
      await luckyDraw.connect(alice).buyTickets(2, 2);
      await luckyDraw.connect(bob).buyTickets(2, 2);
      await luckyDraw.connect(carol).buyTickets(2, 2);

      const tx = await luckyDraw.selectWinnerRandom(2);
      await expect(tx).to.emit(luckyDraw, "WinnersSelected");

      const winners = await luckyDraw.getDrawWinners(2);
      expect(winners.length).to.equal(3);

      // Verify all 3 are distinct participants
      const uniqueWinners = new Set(winners);
      expect(uniqueWinners.size).to.equal(3);
      expect(uniqueWinners.has(alice.address)).to.be.true;
      expect(uniqueWinners.has(bob.address)).to.be.true;
      expect(uniqueWinners.has(carol.address)).to.be.true;
    });

    it("Mode 2 (CRITICAL): Manual selection MUST revert if candidate has 0 tickets", async function () {
      // Carol and nonHolder have 0 tickets in draw #1
      await expect(
        luckyDraw.selectWinnerManual(1, carol.address)
      ).to.be.revertedWithCustomError(luckyDraw, "WinnerMustHoldTicket");

      await expect(
        luckyDraw.selectWinnerManual(1, nonHolder.address)
      ).to.be.revertedWithCustomError(luckyDraw, "WinnerMustHoldTicket");
    });

    it("Mode 2: Should succeed if candidate holds at least 1 valid ticket", async function () {
      // Bob holds 3 tickets
      const tx = await luckyDraw.selectWinnerManual(1, bob.address);
      await expect(tx)
        .to.emit(luckyDraw, "WinnerSelected")
        .withArgs(1, bob.address, 0, 2, owner.address, await time.latest());

      const draw = await luckyDraw.getDraw(1);
      expect(draw.status).to.equal(2); // WINNER_SELECTED
      expect(draw.selectionMode).to.equal(2); // MANUAL
      expect(draw.winner).to.equal(bob.address);
      expect(draw.selectedByAdmin).to.equal(owner.address);
      expect(draw.prizeStatus).to.equal(0); // PENDING
    });

    it("Mode 2 (Multi-Winner): selectWinnersManual should assign multiple winners", async function () {
      // Create draw with winnerCount: 2
      await luckyDraw.createDraw({
        title: "Dual Winner Draw",
        prizeDescription: "2 PS5s",
        prizeCategory: 0,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 50,
        maxTicketsPerWallet: 20,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 2,
      });

      await luckyDraw.connect(alice).buyTickets(2, 1);
      await luckyDraw.connect(bob).buyTickets(2, 1);

      await luckyDraw.selectWinnersManual(2, [alice.address, bob.address]);

      const winners = await luckyDraw.getDrawWinners(2);
      expect(winners.length).to.equal(2);
      expect(winners[0]).to.equal(alice.address);
      expect(winners[1]).to.equal(bob.address);

      const draw = await luckyDraw.getDraw(2);
      expect(draw.status).to.equal(2); // WINNER_SELECTED
      expect(draw.winner).to.equal(alice.address); // First winner backwards compatibility
    });

    it("Mode 2 (Multi-Winner): MUST revert if duplicate winner addresses passed", async function () {
      await luckyDraw.createDraw({
        title: "Duplicate Check Draw",
        prizeDescription: "Test",
        prizeCategory: 0,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 50,
        maxTicketsPerWallet: 20,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 2,
      });

      await luckyDraw.connect(alice).buyTickets(2, 2);

      await expect(
        luckyDraw.selectWinnersManual(2, [alice.address, alice.address])
      ).to.be.revertedWithCustomError(luckyDraw, "DuplicateWinnerAddress");
    });

    it("Mode 2 (Multi-Winner): MUST revert if winners count exceeds draw.winnerCount", async function () {
      // Draw 1 has winnerCount: 1
      await expect(
        luckyDraw.selectWinnersManual(1, [alice.address, bob.address])
      ).to.be.revertedWithCustomError(luckyDraw, "ExceedsMaxWinners");
    });
  });

  describe("Prize Distribution Tracking", function () {
    beforeEach(async function () {
      await luckyDraw.createDraw({
        title: "PS5 Draw",
        prizeDescription: "PS5 Console",
        prizeCategory: 0,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 50,
        maxTicketsPerWallet: 20,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 1,
      });

      await luckyDraw.connect(alice).buyTickets(1, 2);
      await luckyDraw.selectWinnerManual(1, alice.address);
    });

    it("Should allow admin to update prize status through the fulfillment pipeline", async function () {
      // 1. Mark Contacted
      await luckyDraw.updatePrizeStatus(1, 1, "Contacted via X DM @alice_ape"); // WINNER_CONTACTED
      let draw = await luckyDraw.getDraw(1);
      expect(draw.prizeStatus).to.equal(1);
      expect(draw.prizeFulfillmentProof).to.equal("Contacted via X DM @alice_ape");

      // 2. Mark Prize Sent
      await luckyDraw.updatePrizeStatus(1, 2, "FedEx Tracking #94001118995625376182"); // PRIZE_SENT
      draw = await luckyDraw.getDraw(1);
      expect(draw.prizeStatus).to.equal(2);

      // 3. Mark Completed
      await luckyDraw.updatePrizeStatus(1, 3, "Confirmed delivered & received"); // COMPLETED
      draw = await luckyDraw.getDraw(1);
      expect(draw.prizeStatus).to.equal(3);
    });
  });

  describe("Ticket Revenue Claiming for Admin", function () {
    beforeEach(async function () {
      await luckyDraw.createDraw({
        title: "Revenue Test Draw",
        prizeDescription: "PS5 Console",
        prizeCategory: 0,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 50,
        maxTicketsPerWallet: 20,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 1,
      });

      await luckyDraw.connect(alice).buyTickets(1, 4); // 200,000 $APE collected
    });

    it("Should allow admin to withdraw ticket revenue for a specific draw", async function () {
      const treasuryBalBefore = await token.balanceOf(treasury.address);
      await luckyDraw.withdrawTicketRevenue(1, treasury.address);
      const treasuryBalAfter = await token.balanceOf(treasury.address);

      expect(treasuryBalAfter - treasuryBalBefore).to.equal(TICKET_PRICE * 4n);

      const draw = await luckyDraw.getDraw(1);
      expect(draw.revenueWithdrawn).to.be.true;

      // Reverts if attempting to withdraw again
      await expect(
        luckyDraw.withdrawTicketRevenue(1, treasury.address)
      ).to.be.revertedWithCustomError(luckyDraw, "RevenueAlreadyWithdrawn");
    });

    it("Should allow admin to claim ALL ticket revenue across draws in a single transaction", async function () {
      // Create second draw and buy tickets
      await luckyDraw.createDraw({
        title: "Second Draw",
        prizeDescription: "ETH Prize",
        prizeCategory: 1,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 50,
        maxTicketsPerWallet: 20,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 1,
      });
      await luckyDraw.connect(bob).buyTickets(2, 2); // 100,000 $APE

      expect(await luckyDraw.getAvailableTicketRevenueBalance()).to.equal(TICKET_PRICE * 6n);

      const treasuryBalBefore = await token.balanceOf(treasury.address);
      await luckyDraw.claimAllTicketRevenue(treasury.address);
      const treasuryBalAfter = await token.balanceOf(treasury.address);

      expect(treasuryBalAfter - treasuryBalBefore).to.equal(TICKET_PRICE * 6n);
      expect(await luckyDraw.getAvailableTicketRevenueBalance()).to.equal(0);
    });
  });

  describe("Cancellation & Refund Mechanism", function () {
    beforeEach(async function () {
      await luckyDraw.createDraw({
        title: "Cancelled Draw Test",
        prizeDescription: "Merch Pack",
        prizeCategory: 4,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE,
        maxTickets: 50,
        maxTicketsPerWallet: 20,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 1,
      });

      await luckyDraw.connect(alice).buyTickets(1, 2); // 100,000 $APE
      await luckyDraw.connect(bob).buyTickets(1, 3); // 150,000 $APE
    });

    it("Should allow participants to claim refunds if draw is cancelled", async function () {
      await luckyDraw.cancelDraw(1, "Minimum participation threshold not reached");

      const aliceBalBefore = await token.balanceOf(alice.address);
      await luckyDraw.connect(alice).claimTicketRefund(1);
      const aliceBalAfter = await token.balanceOf(alice.address);

      expect(aliceBalAfter - aliceBalBefore).to.equal(TICKET_PRICE * 2n);

      // Cannot claim refund twice
      await expect(
        luckyDraw.connect(alice).claimTicketRefund(1)
      ).to.be.revertedWithCustomError(luckyDraw, "NoRefundAvailable");
    });
  });

  describe("Ticket Fee Customization by Admin", function () {
    beforeEach(async function () {
      await luckyDraw.createDraw({
        title: "Fee Customization Test",
        prizeDescription: "Gaming Rig",
        prizeCategory: 0,
        imageUrl: "",
        ticketPriceApe: TICKET_PRICE, // 50,000 $APE
        maxTickets: 50,
        maxTicketsPerWallet: 20,
        minNftRequired: 1,
        durationSeconds: ONE_DAY,
        winnerCount: 1,
      });
    });

    it("Should allow admin to customize ticket fee for an active draw", async function () {
      const NEW_FEE = ethers.parseEther("25000"); // discount from 50k to 25k
      const tx = await luckyDraw.setTicketPrice(1, NEW_FEE);

      await expect(tx)
        .to.emit(luckyDraw, "TicketPriceUpdated")
        .withArgs(1, TICKET_PRICE, NEW_FEE, owner.address);

      const draw = await luckyDraw.getDraw(1);
      expect(draw.ticketPriceApe).to.equal(NEW_FEE);
    });

    it("Should apply new customized ticket fee to subsequent ticket purchases", async function () {
      const NEW_FEE = ethers.parseEther("75000"); // raise fee to 75k
      await luckyDraw.setTicketPrice(1, NEW_FEE);

      const aliceBalBefore = await token.balanceOf(alice.address);
      await luckyDraw.connect(alice).buyTickets(1, 2);
      const aliceBalAfter = await token.balanceOf(alice.address);

      expect(aliceBalBefore - aliceBalAfter).to.equal(NEW_FEE * 2n);
    });

    it("Should revert if non-admin attempts to customize ticket fee", async function () {
      await expect(
        luckyDraw.connect(alice).setTicketPrice(1, ethers.parseEther("10000"))
      ).to.be.revertedWithCustomError(luckyDraw, "OwnableUnauthorizedAccount");
    });

    it("Should accurately refund exact spent amount when ticket fee was customized midway", async function () {
      // Alice buys 1 ticket at 50,000 $APE
      await luckyDraw.connect(alice).buyTickets(1, 1);

      // Admin customizes fee to 25,000 $APE
      const DISCOUNT_FEE = ethers.parseEther("25000");
      await luckyDraw.setTicketPrice(1, DISCOUNT_FEE);

      // Bob buys 1 ticket at 25,000 $APE
      await luckyDraw.connect(bob).buyTickets(1, 1);

      // Cancel draw
      await luckyDraw.cancelDraw(1, "Cancelled for refund test");

      // Alice claims refund -> gets exact 50,000 $APE back
      const aliceBefore = await token.balanceOf(alice.address);
      await luckyDraw.connect(alice).claimTicketRefund(1);
      const aliceAfter = await token.balanceOf(alice.address);
      expect(aliceAfter - aliceBefore).to.equal(TICKET_PRICE);

      // Bob claims refund -> gets exact 25,000 $APE back
      const bobBefore = await token.balanceOf(bob.address);
      await luckyDraw.connect(bob).claimTicketRefund(1);
      const bobAfter = await token.balanceOf(bob.address);
      expect(bobAfter - bobBefore).to.equal(DISCOUNT_FEE);
    });
  });
});
