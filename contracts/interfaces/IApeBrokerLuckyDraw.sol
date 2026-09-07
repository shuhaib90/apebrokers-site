// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IApeBrokerLuckyDraw
 * @notice Interface for Ape Broker Lucky Draw protocol.
 * @dev Manages custom draws, ticket purchases with $APEBROKE, NFT holder gating,
 *      and dual winner selection (Random vs Manual) with external prize fulfillment tracking.
 */
interface IApeBrokerLuckyDraw {
    // ==========================================
    // ENUMS
    // ==========================================

    enum SelectionMode {
        NONE,
        RANDOM,
        MANUAL
    }

    enum PrizeStatus {
        PENDING,
        WINNER_CONTACTED,
        PRIZE_SENT,
        COMPLETED
    }

    enum DrawStatus {
        ACTIVE,
        CLOSED,
        WINNER_SELECTED,
        CANCELLED
    }

    enum PrizeCategory {
        PHYSICAL,
        ETH,
        TOKEN,
        NFT,
        CUSTOM
    }

    // ==========================================
    // STRUCTS
    // ==========================================

    struct Draw {
        uint256 drawId;
        string title;
        string prizeDescription;
        PrizeCategory prizeCategory;
        string imageUrl;
        uint256 ticketPriceApe;
        uint256 maxTickets;
        uint256 maxTicketsPerWallet;
        uint256 minNftRequired;
        uint256 startTime;
        uint256 endTime;
        DrawStatus status;
        uint256 totalTicketsSold;
        uint256 totalRevenueCollected;
        SelectionMode selectionMode;
        address winner;
        uint256 winningTicketId;
        uint256 selectedTimestamp;
        address selectedByAdmin;
        PrizeStatus prizeStatus;
        string prizeFulfillmentProof;
        bool revenueWithdrawn;
    }

    struct DrawCreateInput {
        string title;
        string prizeDescription;
        PrizeCategory prizeCategory;
        string imageUrl;
        uint256 ticketPriceApe;
        uint256 maxTickets;
        uint256 maxTicketsPerWallet;
        uint256 minNftRequired;
        uint256 durationSeconds;
    }

    // ==========================================
    // CUSTOM ERRORS
    // ==========================================

    error ZeroAddress();
    error ZeroAmount();
    error DrawNotFound();
    error DrawNotActive();
    error DrawNotClosed();
    error DrawAlreadyFinished();
    error DrawNotEligibleForWinner();
    error DrawHasZeroTickets();
    error InsufficientNftBalance(uint256 currentBalance, uint256 requiredBalance);
    error MaxTicketsExceeded();
    error MaxTicketsPerWalletExceeded();
    error DrawAlreadyCancelled();
    error DrawCannotBeCancelled();
    error RevenueAlreadyWithdrawn();
    error NoRefundAvailable();
    error WinnerMustHoldTicket(address candidate);
    error InvalidDuration();
    error InvalidPrizeStatus();

    // ==========================================
    // EVENTS
    // ==========================================

    event DrawCreated(
        uint256 indexed drawId,
        string title,
        string prizeDescription,
        PrizeCategory category,
        uint256 ticketPriceApe,
        uint256 maxTickets,
        uint256 minNftRequired,
        uint256 startTime,
        uint256 endTime
    );

    event TicketsPurchased(
        uint256 indexed drawId,
        address indexed buyer,
        uint256 count,
        uint256 totalCostApe,
        uint256 userTotalTicketsInDraw,
        uint256 drawTotalTicketsSold
    );

    event WinnerSelected(
        uint256 indexed drawId,
        address indexed winner,
        uint256 winningTicketId,
        SelectionMode mode,
        address indexed selectedBy,
        uint256 timestamp
    );

    event PrizeStatusUpdated(
        uint256 indexed drawId,
        address indexed winner,
        PrizeStatus status,
        string proofOrTxHash,
        address indexed updatedBy
    );

    event TicketRevenueWithdrawn(
        uint256 indexed drawId,
        address indexed recipient,
        uint256 amountApe
    );

    event DrawCancelled(
        uint256 indexed drawId,
        string reason,
        address indexed cancelledBy
    );

    event TicketRefundClaimed(
        uint256 indexed drawId,
        address indexed claimer,
        uint256 ticketsRefunded,
        uint256 amountRefundedApe
    );

    event TicketPriceUpdated(
        uint256 indexed drawId,
        uint256 oldPriceApe,
        uint256 newPriceApe,
        address indexed updatedBy
    );

    // ==========================================
    // USER FUNCTIONS
    // ==========================================

    function buyTickets(uint256 drawId, uint256 ticketCount) external;
    function claimTicketRefund(uint256 drawId) external;

    // ==========================================
    // ADMIN FUNCTIONS
    // ==========================================

    function createDraw(DrawCreateInput calldata input) external returns (uint256 drawId);
    function closeDraw(uint256 drawId) external;
    function setTicketPrice(uint256 drawId, uint256 newTicketPriceApe) external;
    function selectWinnerRandom(uint256 drawId) external returns (address winner, uint256 winningTicketId);
    function selectWinnerManual(uint256 drawId, address winner) external;
    function updatePrizeStatus(uint256 drawId, PrizeStatus status, string calldata proofOrTxHash) external;
    function withdrawTicketRevenue(uint256 drawId, address recipient) external;
    function claimAllTicketRevenue(address recipient) external returns (uint256);
    function cancelDraw(uint256 drawId, string calldata reason) external;

    // ==========================================
    // VIEW FUNCTIONS
    // ==========================================

    function getDraw(uint256 drawId) external view returns (Draw memory);
    function getUserTickets(uint256 drawId, address user) external view returns (uint256);
    function getDrawParticipants(uint256 drawId) external view returns (address[] memory);
    function getDrawUniqueParticipantCount(uint256 drawId) external view returns (uint256);
    function totalDrawsCount() external view returns (uint256);
    function getAvailableTicketRevenueBalance() external view returns (uint256);
}
