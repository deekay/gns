import { describe, expect, it } from "vitest";

import { computeAuctionBidderCommitment } from "@gns/protocol";

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
          auctionCommitment: "aa".repeat(32)
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
          auctionCommitment: "bb".repeat(32)
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
          auctionCommitment: "cc".repeat(32)
        }
      ]
    });

    expect(state.phase).toBe("soft_close");
    expect(state.currentLeaderBidderCommitment).toBe(computeAuctionBidderCommitment("beta"));
    expect(state.currentHighestBidSats).toBe(1_100_000_000n);
    expect(state.currentRequiredMinimumBidSats).toBe(1_155_000_000n);
    expect(state.acceptedBidCount).toBe(2);
    expect(state.rejectedBidCount).toBe(1);
    expect(state.visibleBidOutcomes[2]).toMatchObject({
      status: "rejected",
      reason: "reserved_lock_mismatch"
    });
  });
});
