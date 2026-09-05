# Ape Broker Desk — Smart Contracts (Robinhood EVM)

Production-grade, deterministic, gas-efficient Web3 smart contract suite for the **Ape Broker Desk** protocol on **Robinhood EVM**.

---

## 1. Executive Summary

| Parameter | Specification |
| :--- | :--- |
| **Identity Relationship** | `1 NFT = 1 Desk` (Ape Broker NFT `tokenId == deskId`) |
| **Activation Fee** | Exactly **`349,693 $APEBROKE`** (ERC-20) |
| **Max Desks Per Wallet** | **5 Desks** hard cap per wallet address |
| **Base Desk Weight** | `100` (Configurable) |
| **Maximum Boosts** | **5 boosts** hard cap per Desk |
| **Boost Cost Progression** | Exponential doubling: `1× → 2× → 4× → 8× → 16×` |
| **Desk Weight Multipliers**| `Base × (boostCount + 1)` (`100 → 200 → 300 → 400 → 500 → 600`) |
| **Reward Asset** | **Native ETH** |
| **Reward Distribution** | Proportional to **Desk Weight** |
| **Reward Accounting Period** | **5 Hours** (`18,000 seconds`) |
| **Reward Funding Model** | **Manual Admin ETH Deposits** |
| **Fee Accounting** | Activation & boost fees are protocol-collected `$APEBROKE`, strictly isolated from the ETH reward pool |
| **Algorithm** | Scalable **$O(1)$** cumulative index accumulator; **zero loops** over NFT holders |

---

## 2. Core Economic Architecture

```
                    APE BROKER NFT
                          │
                          ▼
                     1 NFT = 1 DESK
                          │
                          ▼
                  ACTIVATE: 349,693
                    $APEBROKE
                          │
                          ▼
                     ACTIVE DESK
                          │
                 ┌────────┴────────┐
                 │                 │
                 ▼                 ▼
             BASE WEIGHT       BOOST SYSTEM
             (e.g. 100)            │
                               MAX 5 BOOSTS
                                   │
                     1× → 2× → 4× → 8× → 16×
                                   │
                                   ▼
                            DESK WEIGHT
                     (100 → 200 → 300 → 400 → 500 → 600)
                                   │
                                   ▼
                         5-HOUR REWARDS
                                   │
                                   │
             ┌─────────────────────┘
             │
             ▼
       ETH REWARD POOL
             ▲
             │
      MANUAL ADMIN DEPOSIT
             ▲
             │
       ADMIN CLAIMS APEBROKE
             ▲
             │
      ACTIVATION + BOOST FEES
```

---

## 3. Detailed Mechanics

### 3.1 1 NFT = 1 Desk
* There is **no separate Desk NFT**. The existing Ape Broker ERC-721 token (`0x5b9ca37d499eace8f526320d6edea10fb73d4ec6`) represents the Desk identity directly.
* Caller must own the NFT (`IERC721.ownerOf(tokenId) == msg.sender`) to activate, boost, or claim.

### 3.2 Desk Activation
* The user calls `activateDesk(tokenId)`.
* Requires exactly `349,693 $APEBROKE` transferred to the contract using OpenZeppelin `SafeERC20`.
* The Desk is assigned `currentWeight = baseDeskWeight` and enters the active set.
* Desks remain active indefinitely (no 30-day expiration, no renewal fees, no daily countdowns).

### 3.3 Boost System
* Each active Desk can be boosted up to 5 times.
* A 6th boost attempt reverts with `MaxBoostsReached()`.
* Boost pricing:
  * **Boost 1**: `baseBoostCost × 1` (e.g. `10,000 $APEBROKE`)
  * **Boost 2**: `baseBoostCost × 2` (e.g. `20,000 $APEBROKE`)
  * **Boost 3**: `baseBoostCost × 4` (e.g. `40,000 $APEBROKE`)
  * **Boost 4**: `baseBoostCost × 8` (e.g. `80,000 $APEBROKE`)
  * **Boost 5**: `baseBoostCost × 16` (e.g. `160,000 $APEBROKE`)
  * Formula: $\text{cost}(n) = \text{baseBoostCost} \times 2^{n-1}$ (calculated via integer bitshift `1 << (n - 1)`).
* Weight scaling:
  * 0 boosts: `100` ($1\times$)
  * 1 boost: `200` ($2\times$)
  * 2 boosts: `300` ($3\times$)
  * 3 boosts: `400` ($4\times$)
  * 4 boosts: `500` ($5\times$)
  * 5 boosts: `600` ($6\times$)
* Boost payments remain protocol-collected `$APEBROKE` fees; they are **never automatically swapped or sent to the reward pool**.

### 3.4 Non-Retroactive Reward Checkpointing
* Prior to updating `currentWeight`, the contract checkpoints pending rewards accrued under the previous weight.
* Boosted weights earn rewards strictly from the boost transaction forward.

### 3.5 Transfer-Safe Reward Accounting
* If Alice transfers or sells NFT #10 to Bob:
  * Alice retains all rewards accrued prior to the transfer.
  * Bob earns rewards only from the transfer moment forward.
  * Alice can call `claimHistoricalRewardsForDesks([10])` or `claimHistoricalRewards()` at any time to withdraw her earned ETH.
  * Desk boost count and weight follow the NFT and do not reset.

### 3.6 $O(1)$ Scalable Reward Distribution
* When admin calls `depositRewards()` with native ETH:
  $$\Delta \text{rewardPerWeight} = \frac{(\text{depositAmount} + \text{remainder}) \times 10^{18}}{\text{totalEligibleWeight}}$$
* Dust remainder from integer division is rolled into `undistributedRewardRemainder` for the next deposit.
* Zero loops over NFT holders ensures constant gas consumption regardless of total supply.

---

## 4. Contract Architecture

* `contracts/ApeBrokerDesk.sol`: Main production protocol contract.
* `contracts/interfaces/IApeBrokerDesk.sol`: Interface containing all functions, events, and custom errors.
* `contracts/mocks/MockERC20.sol`: Test mock for `$APEBROKE`.
* `contracts/mocks/MockERC721.sol`: Test mock for Ape Broker NFT.

---

## 5. Testing & Verification

Run the full test suite (30/30 unit and invariant fuzz tests):

```bash
npm run test:contracts
```

Or using Hardhat directly:

```bash
npx hardhat test --config hardhat.config.cjs
```

### Covered Invariants
1. `boostCount <= 5` across any sequence of calls.
2. $\text{totalClaimedRewards} \le \text{totalDepositedRewards}$ across multi-epoch randomized deposits.
3. Boosted weight never grants retroactive rewards.
4. Protocol fees (`$APEBROKE`) are 100% isolated from native ETH reward liquidity.
5. Accidental direct native ETH transfers (`receive()`, `fallback()`) revert with `DirectEthNotAllowed()`.

---

## 6. Deployment to Robinhood EVM

### Environment Variables
Configure `.env`:

```env
CHAIN_ID=1337
RPC_URL=https://robinhood-mainnet.g.alchemy.com/v2/alch_008u8jC_qTSIJvqgLbdGY
PRIVATE_KEY=your_deployer_private_key

APEBROKE_TOKEN_ADDRESS=0xe0F384ebCede975342c5431aCad515b4A1B862cc
APE_BROKER_NFT_ADDRESS=0x5b9ca37d499eace8f526320d6edea10fb73d4ec6
ADMIN_ADDRESS=your_admin_address
TREASURY_ADDRESS=your_treasury_address
BASE_BOOST_COST=10000000000000000000000
BASE_DESK_WEIGHT=100
```

### Run Deployment Script
```bash
npx hardhat run scripts/deploy.cjs --network robinhood --config hardhat.config.cjs
```

The script automatically generates `src/config/apeBrokerDesk.json` containing the deployed address, configuration, and complete ABI for frontend integration.
