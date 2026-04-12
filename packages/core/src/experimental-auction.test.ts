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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_000_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("beta"),
          bidAmountSats: 1_100_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
            currentRequiredMinimumBidSats: 1_100_000_000n,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        },
        {
          txid: "33".repeat(32),
          blockHeight: 844_211,
          txIndex: 0,
          vout: 1,
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("gamma"),
          bidAmountSats: 1_150_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks + 1,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
            currentRequiredMinimumBidSats: 1_210_000_000n,
            reservedLockBlocks: catalogEntry.reservedLockBlocks + 1
          })
        }
      ]
    });

    expect(state.phase).toBe("soft_close");
    expect(state.currentLeaderBidderCommitment).toBe(computeAuctionBidderCommitment("beta"));
    expect(state.currentHighestBidSats).toBe(1_100_000_000n);
    expect(state.currentRequiredMinimumBidSats).toBe(1_210_000_000n);
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_000_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("beta"),
          bidAmountSats: 1_100_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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

  it("releases a no-bid lot to the ordinary lane and rejects later auction bids", () => {
    const policy = createDefaultReservedAuctionPolicy();
    const catalogEntry = createExperimentalReservedAuctionCatalogEntry(
      {
        auctionId: "02-awaiting-opening-sequoia",
        title: "Awaiting opening bid · sequoia",
        description: "Major existing name after unlock but before a valid opening bid.",
        name: "sequoia",
        reservedClassId: "major_existing_name",
        unlockBlock: 880_000
      },
      policy
    );

    const state = deriveExperimentalReservedAuctionState({
      policy,
      currentBlockHeight: 884_321,
      catalogEntry,
      bidObservations: [
        {
          txid: "11".repeat(32),
          blockHeight: 880_015,
          txIndex: 0,
          vout: 1,
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("speculator_a"),
          bidAmountSats: 150_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
          auctionCommitment: computeAuctionBidStateCommitment({
            auctionId: catalogEntry.auctionId,
            name: catalogEntry.normalizedName,
            reservedClassId: catalogEntry.reservedClassId,
            currentBlockHeight: 880_015,
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
          blockHeight: 884_321,
          txIndex: 0,
          vout: 1,
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("speculator_b"),
          bidAmountSats: 250_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
          auctionCommitment: "00".repeat(32)
        }
      ]
    });

    expect(state.phase).toBe("released_to_ordinary_lane");
    expect(state.currentRequiredMinimumBidSats).toBeNull();
    expect(state.ordinaryMinimumBidSats).toBe(1_562_500n);
    expect(state.noBidReleaseBlock).toBe(884_320);
    expect(state.blocksUntilNoBidRelease).toBe(0);
    expect(state.acceptedBidCount).toBe(0);
    expect(state.rejectedBidCount).toBe(2);
    expect(state.visibleBidOutcomes[1]).toMatchObject({
      status: "rejected",
      reason: "released_to_ordinary_lane",
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_000_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("beta"),
          bidAmountSats: 1_100_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
            currentRequiredMinimumBidSats: 1_100_000_000n,
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

  it("flags accepted bid bonds spent before their release point", () => {
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_000_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("beta"),
          bidAmountSats: 1_100_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
            currentRequiredMinimumBidSats: 1_100_000_000n,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        }
      ],
      spentOutpoints: [
        {
          outpointTxid: "11".repeat(32),
          outpointVout: 0,
          spentTxid: "aa".repeat(32),
          spentBlockHeight: 844_220,
          spentTxIndex: 0,
          spendingInputIndex: 0
        },
        {
          outpointTxid: "22".repeat(32),
          outpointVout: 0,
          spentTxid: "bb".repeat(32),
          spentBlockHeight: 844_221,
          spentTxIndex: 0,
          spendingInputIndex: 0
        }
      ]
    });

    expect(state.visibleBidOutcomes[0]).toMatchObject({
      bondStatus: "superseded_locked_until_settlement",
      bondReleaseBlock: 844355,
      bondSpendStatus: "spent_before_allowed_release",
      bondSpentTxid: "aa".repeat(32),
      bondSpentBlockHeight: 844220
    });
    expect(state.visibleBidOutcomes[1]).toMatchObject({
      bondStatus: "leading_locked",
      bondReleaseBlock: null,
      bondSpendStatus: "spent_before_allowed_release",
      bondSpentTxid: "bb".repeat(32),
      bondSpentBlockHeight: 844221
    });
  });

  it("marks settled bid spends after their release point as allowed", () => {
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
    const winnerReleaseBlock = 844_210 + catalogEntry.reservedLockBlocks;
    const losingReleaseBlock = 844_355;

    const state = deriveExperimentalReservedAuctionState({
      policy,
      currentBlockHeight: winnerReleaseBlock + 10,
      catalogEntry,
      bidObservations: [
        {
          txid: "11".repeat(32),
          blockHeight: 840_010,
          txIndex: 0,
          vout: 1,
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_000_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("beta"),
          bidAmountSats: 1_100_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
            currentRequiredMinimumBidSats: 1_100_000_000n,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        }
      ],
      spentOutpoints: [
        {
          outpointTxid: "11".repeat(32),
          outpointVout: 0,
          spentTxid: "cc".repeat(32),
          spentBlockHeight: losingReleaseBlock,
          spentTxIndex: 0,
          spendingInputIndex: 0
        },
        {
          outpointTxid: "22".repeat(32),
          outpointVout: 0,
          spentTxid: "dd".repeat(32),
          spentBlockHeight: winnerReleaseBlock,
          spentTxIndex: 0,
          spendingInputIndex: 0
        }
      ]
    });

    expect(state.visibleBidOutcomes[0]).toMatchObject({
      bondStatus: "losing_bid_releasable",
      bondReleaseBlock: losingReleaseBlock,
      bondSpendStatus: "spent_after_allowed_release",
      bondSpentTxid: "cc".repeat(32),
      bondSpentBlockHeight: losingReleaseBlock
    });
    expect(state.visibleBidOutcomes[1]).toMatchObject({
      bondStatus: "winner_releasable",
      bondReleaseBlock: winnerReleaseBlock,
      bondSpendStatus: "spent_after_allowed_release",
      bondSpentTxid: "dd".repeat(32),
      bondSpentBlockHeight: winnerReleaseBlock
    });
  });

  it("treats a same-bidder rebid as a replacement only when it spends the prior bid bond", () => {
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_000_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
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
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_100_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [
            {
              txid: "11".repeat(32),
              vout: 0
            }
          ],
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
            currentRequiredMinimumBidSats: 1_100_000_000n,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        },
        {
          txid: "33".repeat(32),
          blockHeight: 844_211,
          txIndex: 0,
          vout: 1,
          bondVout: 0,
          bidderCommitment: computeAuctionBidderCommitment("alpha"),
          bidAmountSats: 1_200_000_000n,
          reservedLockBlocks: catalogEntry.reservedLockBlocks,
          auctionLotCommitment: catalogEntry.auctionLotCommitment,
          spentOutpoints: [],
          auctionCommitment: computeAuctionBidStateCommitment({
            auctionId: catalogEntry.auctionId,
            name: catalogEntry.normalizedName,
            reservedClassId: catalogEntry.reservedClassId,
            currentBlockHeight: 844_211,
            phase: "soft_close",
            unlockBlock: catalogEntry.unlockBlock,
            auctionCloseBlockAfter: 844_354,
            openingMinimumBidSats: catalogEntry.openingMinimumBidSats,
            currentLeaderBidderCommitment: computeAuctionBidderCommitment("alpha"),
            currentHighestBidSats: 1_100_000_000n,
            currentRequiredMinimumBidSats: 1_210_000_000n,
            reservedLockBlocks: catalogEntry.reservedLockBlocks
          })
        }
      ]
    });

    expect(state.currentLeaderBidderCommitment).toBe(computeAuctionBidderCommitment("alpha"));
    expect(state.currentHighestBidSats).toBe(1_100_000_000n);
    expect(state.acceptedBidCount).toBe(2);
    expect(state.rejectedBidCount).toBe(1);
    expect(state.currentlyLockedAcceptedBidCount).toBe(1);
    expect(state.currentlyLockedAcceptedBidAmountSats).toBe(1_100_000_000n);
    expect(state.visibleBidOutcomes[0]).toMatchObject({
      reason: "opening_bid",
      bondStatus: "replaced_by_self_rebid",
      bondReleaseBlock: 844_210
    });
    expect(state.visibleBidOutcomes[1]).toMatchObject({
      reason: "replacement_bid_soft_close_extended",
      bondStatus: "leading_locked"
    });
    expect(state.visibleBidOutcomes[2]).toMatchObject({
      status: "rejected",
      reason: "prior_bid_not_replaced",
      bondStatus: "rejected_not_tracked"
    });
  });
});
