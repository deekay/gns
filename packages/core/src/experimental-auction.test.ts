import { describe, expect, it } from "vitest";

import {
  computeAuctionBidStateCommitment,
  computeAuctionBidderCommitment
} from "@gns/protocol";

import { createDefaultReservedAuctionPolicy } from "./auction-policy.js";
import {
  createExperimentalReservedAuctionCatalogEntry,
  deriveExperimentalReservedAuctionState
} from "./experimental-auction.js";

describe("experimental reserved auction derivation", () => {
  it("derives leader, next minimum, and soft-close state from observed bids", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const catalogEntry = createExperimentalReservedAuctionCatalogEntry(
      {
        auctionId: "04-soft-close-google",
        title: "Soft close · google",
        description: "Experimental live test lot.",
        name: "google",
        reservedClassId: "top_collision",
        unlockBlock: 840_000
      },
      policy
    );

    const state = deriveExperimentalReservedAuctionState({
      policy,
      currentBlockHeight: 844_250,
      catalogEntry,
      bidObservations: [
        {
          txid: "11".repeat(32),
          blockHeight: 840_010,
          txIndex: 0,
          vout: 1,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_000_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          auctionCommitment: computeAuctionBidStateCommitment({
            auctionId: catalogEntry.auctionId,
            name: catalogEntry.normalizedName,
            reservedClassId: catalogEntry.reservedClassId,
            currentBlockHeight: 840_010,
            phase: "awaiting_opening_bid",
            unlockBlock: catalogEntry.unlockBlock,
            auctionCloseBlockAfter: null,
            openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
            currentLeaderBidderCommitment: null,
            currentHighestBidSats: null,
            currentRequiredMinimumBidSats: catalogEntry.openingMinimumBidSats,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        },
        {
          txid: "22".repeat(32),
          blockHeight: 844_210,
          txIndex: 0,
          vout: 1,
          bidderCommitment: computeAuctionBidderCommitment("beta"),
          bidAmountSats: 1_100_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          auctionCommitment: computeAuctionBidStateCommitment({
            auctionId: catalogEntry.auctionId,
            name: catalogEntry.normalizedName,
            reservedClassId: catalogEntry.reservedClassId,
            currentBlockHeight: 844_210,
            phase: "soft_close",
            unlockBlock: catalogEntry.unlockBlock,
            auctionCloseBlockAfter: 844_330,
            openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
            currentLeaderBidderCommitment: computeAuctionBidderCommitment("alpha"),
            currentHighestBidSats: 1_000_000_000n,
            currentRequiredMinimumBidSats: 1_050_000_000n,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        },
        {
          txid: "33".repeat(32),
          blockHeight: 844_211,
          txIndex: 0,
          vout: 1,
          bidderCommitment: computeAuctionBidderCommitment("gamma"),
          bidAmountSats: 1_150_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks + 1,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          auctionCommitment: computeAuctionBidStateCommitment({
            auctionId: catalogEntry.auctionId,
            name: catalogEntry.normalizedName,
            reservedClassId: catalogEntry.reservedClassId,
            currentBlockHeight: 844_211,
            phase: "soft_close",
            unlockBlock: catalogEntry.unlockBlock,
            auctionCloseBlockAfter: 844_330,
            openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
            currentLeaderBidderCommitment: computeAuctionBidderCommitment("beta"),
            currentHighestBidSats: 1_100_000_000n,
            currentRequiredMinimumBidSats: 1_155_000_000n,
            reservedLockBlocks: catalogEntry.reservedLockBlocks + 1
          })
        }
      ]
    });

    expect(state.phase).toBe("soft_close");
    expect(state.currentLeaderBidderCommitment).toBe(computeAuctionBidderCommitment("beta"));
    expect(state.currentHighestBidSats).toBe(1_100_000_000n);
    expect(state.currentRequiredMinimumBidSats).toBe(1_155_000_000n);
    expect(state.acceptedBidCount).toBe(2);
    expect(state.rejectedBidCount).toBe(1);
    expect(state.currentlyLockedAcceptedBidCount).toBe(2);
    expect(state.currentlyLockedAcceptedBidAmountSats).toBe(2_100_000_000n);
    expect(state.visibleBidOutcomes[2]).toMatchObject({
      status: "rejected",
      reason: "reserved_lock_mismatch",
      bondStatus: "rejected_not_tracked"
    });
  });

  it("rejects bids whose auction state commitment no longer matches the observed pre-bid state", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const catalogEntry = createExperimentalReservedAuctionCatalogEntry(
      {
        auctionId: "04-soft-close-google",
        title: "Soft close · google",
        description: "Experimental live test lot.",
        name: "google",
        reservedClassId: "top_collision",
        unlockBlock: 840_000
      },
      policy
    );

    const state = deriveExperimentalReservedAuctionState({
      policy,
      currentBlockHeight: 844_250,
      catalogEntry,
      bidObservations: [
        {
          txid: "11".repeat(32),
          blockHeight: 840_010,
          txIndex: 0,
          vout: 1,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_000_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          auctionCommitment: computeAuctionBidStateCommitment({
            auctionId: catalogEntry.auctionId,
            name: catalogEntry.normalizedName,
            reservedClassId: catalogEntry.reservedClassId,
            currentBlockHeight: 840_010,
            phase: "awaiting_opening_bid",
            unlockBlock: catalogEntry.unlockBlock,
            auctionCloseBlockAfter: null,
            openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
            currentLeaderBidderCommitment: null,
            currentHighestBidSats: null,
            currentRequiredMinimumBidSats: catalogEntry.openingMinimumBidSats,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        },
        {
          txid: "22".repeat(32),
          blockHeight: 840_020,
          txIndex: 0,
          vout: 1,
          bidderCommitment: computeAuctionBidderCommitment("beta"),
          bidAmountSats: 1_100_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          auctionCommitment: computeAuctionBidStateCommitment({
            auctionId: catalogEntry.auctionId,
            name: catalogEntry.normalizedName,
            reservedClassId: catalogEntry.reservedClassId,
            currentBlockHeight: 840_019,
            phase: "awaiting_opening_bid",
            unlockBlock: catalogEntry.unlockBlock,
            auctionCloseBlockAfter: null,
            openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
            currentLeaderBidderCommitment: null,
            currentHighestBidSats: null,
            currentRequiredMinimumBidSats: catalogEntry.openingMinimumBidSats,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        }
      ]
    });

    expect(state.currentLeaderBidderCommitment).toBe(computeAuctionBidderCommitment("alpha"));
    expect(state.acceptedBidCount).toBe(1);
    expect(state.rejectedBidCount).toBe(1);
    expect(state.visibleBidOutcomes[1]).toMatchObject({
      status: "rejected",
      reason: "stale_state_commitment",
      stateCommitmentMatched: false,
      bondStatus: "rejected_not_tracked"
    });
  });

  it("derives settlement and release status for accepted bids after close", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const catalogEntry = createExperimentalReservedAuctionCatalogEntry(
      {
        auctionId: "04-soft-close-google",
        title: "Soft close · google",
        description: "Experimental live test lot.",
        name: "google",
        reservedClassId: "top_collision",
        unlockBlock: 840_000
      },
      policy
    );

    const state = deriveExperimentalReservedAuctionState({
      policy,
      currentBlockHeight: 1_370_000,
      catalogEntry,
      bidObservations: [
        {
          txid: "11".repeat(32),
          blockHeight: 840_010,
          txIndex: 0,
          vout: 1,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_000_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          auctionCommitment: computeAuctionBidStateCommitment({
            auctionId: catalogEntry.auctionId,
            name: catalogEntry.normalizedName,
            reservedClassId: catalogEntry.reservedClassId,
            currentBlockHeight: 840_010,
            phase: "awaiting_opening_bid",
            unlockBlock: catalogEntry.unlockBlock,
            auctionCloseBlockAfter: null,
            openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
            currentLeaderBidderCommitment: null,
            currentHighestBidSats: null,
            currentRequiredMinimumBidSats: catalogEntry.openingMinimumBidSats,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        },
        {
          txid: "22".repeat(32),
          blockHeight: 844_210,
          txIndex: 0,
          vout: 1,
          bidderCommitment: computeAuctionBidderCommitment("beta"),
          bidAmountSats: 1_100_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          auctionCommitment: computeAuctionBidStateCommitment({
            auctionId: catalogEntry.auctionId,
            name: catalogEntry.normalizedName,
            reservedClassId: catalogEntry.reservedClassId,
            currentBlockHeight: 844_210,
            phase: "soft_close",
            unlockBlock: catalogEntry.unlockBlock,
            auctionCloseBlockAfter: 844_330,
            openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
            currentLeaderBidderCommitment: computeAuctionBidderCommitment("alpha"),
            currentHighestBidSats: 1_000_000_000n,
            currentRequiredMinimumBidSats: 1_050_000_000n,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        }
      ]
    });

    expect(state.phase).toBe("settled");
    expect(state.winnerBidTxid).toBe("22".repeat(32));
    expect(state.winnerBidderCommitment).toBe(computeAuctionBidderCommitment("beta"));
    expect(state.winnerBondReleaseBlock).toBe(844_210 + catalogEntry.reservedLockBlocks);
    expect(state.currentlyLockedAcceptedBidCount).toBe(0);
    expect(state.releasableAcceptedBidCount).toBe(2);
    expect(state.releasableAcceptedBidAmountSats).toBe(2_100_000_000n);
    expect(state.visibleBidOutcomes[0]).toMatchObject({
      bondStatus: "losing_bid_releasable"
    });
    expect(state.visibleBidOutcomes[1]).toMatchObject({
      bondStatus: "winner_releasable"
    });
  });
});
