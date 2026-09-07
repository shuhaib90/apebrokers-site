// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IApeBrokerLuckyDraw.sol";

/**
 * @title ApeBrokerLuckyDraw
 * @notice Production-grade Lucky Draw protocol on Robinhood EVM for Ape Broker NFT holders.
 * @dev Separate contract from Desk activations and staking.
 *
 * Core Protocol Principles:
 * 1. NO AUTOMATIC REWARD DISTRIBUTIONS:
 *    The contract does NOT automatically transfer or distribute prizes upon draw completion.
 *    The contract ONLY manages ticket pricing in $APEBROKE, ticket sales, and winner selection.
 * 2. ADMIN DIRECT PRIZE DELIVERY:
 *    Upon draw completion, the contract permanently records the official winner address on-chain.
 *    The admin can see the winner's address and details, and directly delivers the prize to the winner
 *    (via direct external transfer, wallet send, or physical shipping) then updates fulfillment proofs on-chain.
 * 3. NFT GATED: Only verified Ape Broker NFT holders can participate in draws.
 * 4. DUAL WINNER SELECTION: Secure Random on-chain draw OR strictly verified Manual pick (must hold >= 1 ticket).
 * 5. 100% CLAIMABLE TICKET REVENUE: All $APEBROKE collected from ticket fees is withdrawable by the admin.
 */
contract ApeBrokerLuckyDraw is IApeBrokerLuckyDraw, Ownable2Step, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Tokens & Addresses
    IERC20 public immutable apeBrokeToken;
    IERC721 public immutable apeBrokerNft;

    // State Tracking
    uint256 public nextDrawId;
    uint256 public totalProtocolTicketRevenue;
    uint256 public totalProtocolTicketRevenueWithdrawn;

    mapping(uint256 => Draw) public draws;
    mapping(uint256 => address[]) private _drawTickets;
    mapping(uint256 => mapping(address => uint256)) public userTicketCount;
    mapping(uint256 => mapping(address => uint256)) public userSpentAmountApe;
    mapping(uint256 => address[]) private _uniqueParticipants;
    mapping(uint256 => mapping(address => bool)) private _isUniqueParticipant;
    mapping(uint256 => mapping(address => bool)) public hasClaimedRefund;

    /**
     * @notice Constructor initializes contract with $APEBROKE token and Ape Broker NFT collection.
     * @param _apeBrokeToken Address of the $APEBROKE ERC-20 token.
     * @param _apeBrokerNft Address of the Ape Broker NFT collection.
     * @param _admin Address of initial admin owner.
     */
    constructor(
        address _apeBrokeToken,
        address _apeBrokerNft,
        address _admin
    ) Ownable(_admin) {
        if (_apeBrokeToken == address(0) || _apeBrokerNft == address(0) || _admin == address(0)) {
            revert ZeroAddress();
        }
        apeBrokeToken = IERC20(_apeBrokeToken);
        apeBrokerNft = IERC721(_apeBrokerNft);
    }

    // ==========================================
    // USER ACTIONS
    // ==========================================

    /**
     * @notice Purchases lucky draw tickets using $APEBROKE tokens.
     * @dev Caller must hold >= minNftRequired Ape Broker NFTs.
     * @param drawId The ID of the draw.
     * @param ticketCount Number of tickets to purchase.
     */
    function buyTickets(uint256 drawId, uint256 ticketCount) external nonReentrant whenNotPaused {
        if (ticketCount == 0) revert ZeroAmount();

        Draw storage draw = draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.status != DrawStatus.ACTIVE) revert DrawNotActive();

        // Enforce time bounds
        if (block.timestamp < draw.startTime || block.timestamp >= draw.endTime) {
            revert DrawNotActive();
        }

        // Enforce Ape Broker NFT holder gating
        uint256 nftBal = apeBrokerNft.balanceOf(msg.sender);
        if (nftBal < draw.minNftRequired) {
            revert InsufficientNftBalance(nftBal, draw.minNftRequired);
        }

        // Enforce maximum total tickets limit if set
        if (draw.maxTickets > 0 && draw.totalTicketsSold + ticketCount > draw.maxTickets) {
            revert MaxTicketsExceeded();
        }

        // Enforce per-wallet ticket limit if set
        uint256 currentUserTickets = userTicketCount[drawId][msg.sender];
        if (draw.maxTicketsPerWallet > 0 && currentUserTickets + ticketCount > draw.maxTicketsPerWallet) {
            revert MaxTicketsPerWalletExceeded();
        }

        uint256 totalCostApe = ticketCount * draw.ticketPriceApe;

        // Checks-Effects
        draw.totalTicketsSold += ticketCount;
        draw.totalRevenueCollected += totalCostApe;
        totalProtocolTicketRevenue += totalCostApe;

        userTicketCount[drawId][msg.sender] = currentUserTickets + ticketCount;
        userSpentAmountApe[drawId][msg.sender] += totalCostApe;

        if (!_isUniqueParticipant[drawId][msg.sender]) {
            _isUniqueParticipant[drawId][msg.sender] = true;
            _uniqueParticipants[drawId].push(msg.sender);
        }

        // Append ticket entries for proportional probability
        for (uint256 i = 0; i < ticketCount; ) {
            _drawTickets[drawId].push(msg.sender);
            unchecked {
                ++i;
            }
        }

        // Auto-close draw if maxTickets reached
        if (draw.maxTickets > 0 && draw.totalTicketsSold >= draw.maxTickets) {
            draw.status = DrawStatus.CLOSED;
        }

        emit TicketsPurchased(
            drawId,
            msg.sender,
            ticketCount,
            totalCostApe,
            userTicketCount[drawId][msg.sender],
            draw.totalTicketsSold
        );

        // Interactions: pull tokens to contract custody
        if (totalCostApe > 0) {
            apeBrokeToken.safeTransferFrom(msg.sender, address(this), totalCostApe);
        }
    }

    /**
     * @notice Reclaims $APEBROKE tokens spent if a draw is cancelled.
     * @param drawId The ID of the cancelled draw.
     */
    function claimTicketRefund(uint256 drawId) external nonReentrant {
        Draw storage draw = draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.status != DrawStatus.CANCELLED) revert DrawCannotBeCancelled();
        if (hasClaimedRefund[drawId][msg.sender]) revert NoRefundAvailable();

        uint256 tickets = userTicketCount[drawId][msg.sender];
        uint256 refundAmount = userSpentAmountApe[drawId][msg.sender];
        if (tickets == 0 || refundAmount == 0) revert NoRefundAvailable();

        hasClaimedRefund[drawId][msg.sender] = true;
        userSpentAmountApe[drawId][msg.sender] = 0;

        emit TicketRefundClaimed(drawId, msg.sender, tickets, refundAmount);

        if (refundAmount > 0) {
            apeBrokeToken.safeTransfer(msg.sender, refundAmount);
        }
    }

    // ==========================================
    // ADMIN ACTIONS
    // ==========================================

    /**
     * @notice Creates a new custom Lucky Draw.
     * @param input Creation parameters.
     * @return drawId The assigned ID of the newly created draw.
     */
    function createDraw(DrawCreateInput calldata input) external onlyOwner returns (uint256 drawId) {
        if (input.durationSeconds == 0) revert InvalidDuration();

        drawId = ++nextDrawId;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + input.durationSeconds;
        uint256 minNft = input.minNftRequired > 0 ? input.minNftRequired : 1;

        draws[drawId] = Draw({
            drawId: drawId,
            title: input.title,
            prizeDescription: input.prizeDescription,
            prizeCategory: input.prizeCategory,
            imageUrl: input.imageUrl,
            ticketPriceApe: input.ticketPriceApe,
            maxTickets: input.maxTickets,
            maxTicketsPerWallet: input.maxTicketsPerWallet,
            minNftRequired: minNft,
            startTime: startTime,
            endTime: endTime,
            status: DrawStatus.ACTIVE,
            totalTicketsSold: 0,
            totalRevenueCollected: 0,
            selectionMode: SelectionMode.NONE,
            winner: address(0),
            winningTicketId: 0,
            selectedTimestamp: 0,
            selectedByAdmin: address(0),
            prizeStatus: PrizeStatus.PENDING,
            prizeFulfillmentProof: "",
            revenueWithdrawn: false
        });

        emit DrawCreated(
            drawId,
            input.title,
            input.prizeDescription,
            input.prizeCategory,
            input.ticketPriceApe,
            input.maxTickets,
            minNft,
            startTime,
            endTime
        );
    }

    /**
     * @notice Closes ticket sales for an active draw ahead of winner selection.
     * @param drawId The ID of the draw.
     */
    function closeDraw(uint256 drawId) external onlyOwner {
        Draw storage draw = draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.status != DrawStatus.ACTIVE) revert DrawNotActive();

        draw.status = DrawStatus.CLOSED;
    }

    /**
     * @notice Admin customizes/updates the ticket fee in $APEBROKE for an active or upcoming draw.
     * @param drawId The ID of the draw.
     * @param newTicketPriceApe The new ticket price in $APEBROKE (18 decimals).
     */
    function setTicketPrice(uint256 drawId, uint256 newTicketPriceApe) external onlyOwner {
        Draw storage draw = draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.status != DrawStatus.ACTIVE && draw.status != DrawStatus.CLOSED) {
            revert DrawAlreadyFinished();
        }

        uint256 oldPrice = draw.ticketPriceApe;
        draw.ticketPriceApe = newTicketPriceApe;

        emit TicketPriceUpdated(drawId, oldPrice, newTicketPriceApe, msg.sender);
    }

    /**
     * @notice Mode 1: Selects a winner randomly using on-chain secure pseudo-randomness.
     * @dev Selection is final and recorded permanently on-chain.
     * @param drawId The ID of the draw.
     * @return winner The chosen winner address.
     * @return winningTicketId The chosen winning ticket number (1-indexed).
     */
    function selectWinnerRandom(uint256 drawId) external onlyOwner nonReentrant returns (address winner, uint256 winningTicketId) {
        Draw storage draw = draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.status != DrawStatus.ACTIVE && draw.status != DrawStatus.CLOSED) {
            revert DrawNotEligibleForWinner();
        }
        if (draw.totalTicketsSold == 0) {
            revert DrawHasZeroTickets();
        }

        // Verifiable on-chain pseudo-randomness seed
        uint256 randomSeed = uint256(
            keccak256(
                abi.encodePacked(
                    block.prevrandao,
                    block.timestamp,
                    blockhash(block.number - 1),
                    drawId,
                    draw.totalTicketsSold,
                    msg.sender
                )
            )
        );

        uint256 winningIndex = randomSeed % draw.totalTicketsSold;
        winner = _drawTickets[drawId][winningIndex];
        winningTicketId = winningIndex + 1;

        draw.winner = winner;
        draw.winningTicketId = winningTicketId;
        draw.selectionMode = SelectionMode.RANDOM;
        draw.selectedTimestamp = block.timestamp;
        draw.selectedByAdmin = msg.sender;
        draw.status = DrawStatus.WINNER_SELECTED;
        draw.prizeStatus = PrizeStatus.PENDING;

        emit WinnerSelected(drawId, winner, winningTicketId, SelectionMode.RANDOM, msg.sender, block.timestamp);
    }

    /**
     * @notice Mode 2: Selects a winner manually by the admin.
     * @dev Strictly verifies that the candidate address owns at least 1 valid ticket in that draw!
     * @param drawId The ID of the draw.
     * @param winner Candidate winner wallet address.
     */
    function selectWinnerManual(uint256 drawId, address winner) external onlyOwner nonReentrant {
        if (winner == address(0)) revert ZeroAddress();

        Draw storage draw = draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.status != DrawStatus.ACTIVE && draw.status != DrawStatus.CLOSED) {
            revert DrawNotEligibleForWinner();
        }
        if (draw.totalTicketsSold == 0) {
            revert DrawHasZeroTickets();
        }

        // STRICT CONTRACT ENFORCEMENT: Winner must hold at least 1 ticket for this draw!
        if (userTicketCount[drawId][winner] == 0) {
            revert WinnerMustHoldTicket(winner);
        }

        draw.winner = winner;
        draw.winningTicketId = 0; // Manual selection has no single random ticket ID
        draw.selectionMode = SelectionMode.MANUAL;
        draw.selectedTimestamp = block.timestamp;
        draw.selectedByAdmin = msg.sender;
        draw.status = DrawStatus.WINNER_SELECTED;
        draw.prizeStatus = PrizeStatus.PENDING;

        emit WinnerSelected(drawId, winner, 0, SelectionMode.MANUAL, msg.sender, block.timestamp);
    }

    /**
     * @notice Updates the external prize distribution fulfillment pipeline.
     * @param drawId The ID of the completed draw.
     * @param status The new fulfillment status (Pending, Contacted, Sent, Completed).
     * @param proofOrTxHash External transaction hash, shipping tracking, or verification proof string.
     */
    function updatePrizeStatus(
        uint256 drawId,
        PrizeStatus status,
        string calldata proofOrTxHash
    ) external onlyOwner {
        Draw storage draw = draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.status != DrawStatus.WINNER_SELECTED) {
            revert DrawNotEligibleForWinner();
        }

        draw.prizeStatus = status;
        if (bytes(proofOrTxHash).length > 0) {
            draw.prizeFulfillmentProof = proofOrTxHash;
        }

        emit PrizeStatusUpdated(drawId, draw.winner, status, proofOrTxHash, msg.sender);
    }

    /**
     * @notice Admin withdraws collected $APEBROKE ticket revenue for a specific draw.
     * @dev All ticket price used for draws is 100% claimable for the admin.
     * @param drawId The ID of the draw.
     * @param recipient The treasury or admin recipient address.
     */
    function withdrawTicketRevenue(uint256 drawId, address recipient) public onlyOwner nonReentrant {
        if (recipient == address(0)) revert ZeroAddress();

        Draw storage draw = draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.status == DrawStatus.CANCELLED) revert DrawCannotBeCancelled();
        if (draw.revenueWithdrawn) revert RevenueAlreadyWithdrawn();

        uint256 amountApe = draw.totalRevenueCollected;
        if (amountApe == 0) revert ZeroAmount();

        draw.revenueWithdrawn = true;
        totalProtocolTicketRevenueWithdrawn += amountApe;

        emit TicketRevenueWithdrawn(drawId, recipient, amountApe);

        apeBrokeToken.safeTransfer(recipient, amountApe);
    }

    /**
     * @notice Admin claims ALL accumulated unwithdrawn ticket revenue across all draws in a single transaction.
     * @dev All ticket price used for draws is 100% claimable for the admin.
     * @param recipient The treasury or admin recipient address.
     * @return claimedAmount Total $APEBROKE claimed.
     */
    function claimAllTicketRevenue(address recipient) external onlyOwner nonReentrant returns (uint256 claimedAmount) {
        if (recipient == address(0)) revert ZeroAddress();

        claimedAmount = getAvailableTicketRevenueBalance();
        if (claimedAmount == 0) revert ZeroAmount();

        totalProtocolTicketRevenueWithdrawn += claimedAmount;

        // Mark all active/completed draws with unwithdrawn revenue as withdrawn
        for (uint256 i = 1; i <= nextDrawId; ) {
            if (draws[i].totalRevenueCollected > 0 && !draws[i].revenueWithdrawn && draws[i].status != DrawStatus.CANCELLED) {
                draws[i].revenueWithdrawn = true;
                emit TicketRevenueWithdrawn(i, recipient, draws[i].totalRevenueCollected);
            }
            unchecked {
                ++i;
            }
        }

        apeBrokeToken.safeTransfer(recipient, claimedAmount);
    }

    /**
     * @notice Cancels an active or closed draw (e.g. insufficient entries).
     * @dev Makes ticket funds refundable to participants.
     * @param drawId The ID of the draw.
     * @param reason Explanation for cancellation.
     */
    function cancelDraw(uint256 drawId, string calldata reason) external onlyOwner {
        Draw storage draw = draws[drawId];
        if (draw.drawId == 0) revert DrawNotFound();
        if (draw.status == DrawStatus.WINNER_SELECTED) revert DrawAlreadyFinished();
        if (draw.status == DrawStatus.CANCELLED) revert DrawAlreadyCancelled();

        draw.status = DrawStatus.CANCELLED;

        emit DrawCancelled(drawId, reason, msg.sender);
    }

    /**
     * @notice Emergency pause for ticket buying.
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpauses ticket buying.
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ==========================================
    // VIEW / QUERY FUNCTIONS
    // ==========================================

    /**
     * @notice Returns full draw struct details.
     */
    function getDraw(uint256 drawId) external view returns (Draw memory) {
        return draws[drawId];
    }

    /**
     * @notice Returns number of tickets owned by a user in a specific draw.
     */
    function getUserTickets(uint256 drawId, address user) external view returns (uint256) {
        return userTicketCount[drawId][user];
    }

    /**
     * @notice Returns array of unique participant wallet addresses for a draw.
     */
    function getDrawParticipants(uint256 drawId) external view returns (address[] memory) {
        return _uniqueParticipants[drawId];
    }

    /**
     * @notice Returns count of unique participants in a draw.
     */
    function getDrawUniqueParticipantCount(uint256 drawId) external view returns (uint256) {
        return _uniqueParticipants[drawId].length;
    }

    /**
     * @notice Returns total number of draws created.
     */
    function totalDrawsCount() external view returns (uint256) {
        return nextDrawId;
    }

    /**
     * @notice Checks whether a user holds >= minNftRequired Ape Broker NFTs.
     */
    function isEligibleToEnter(uint256 drawId, address user) external view returns (bool eligible, uint256 nftBalance) {
        if (user == address(0)) return (false, 0);
        Draw memory draw = draws[drawId];
        uint256 minReq = draw.minNftRequired > 0 ? draw.minNftRequired : 1;
        nftBalance = apeBrokerNft.balanceOf(user);
        eligible = nftBalance >= minReq;
    }

    /**
     * @notice Returns total unwithdrawn ticket revenue across the protocol.
     */
    function getAvailableTicketRevenueBalance() public view returns (uint256) {
        return totalProtocolTicketRevenue > totalProtocolTicketRevenueWithdrawn
            ? totalProtocolTicketRevenue - totalProtocolTicketRevenueWithdrawn
            : 0;
    }
}
