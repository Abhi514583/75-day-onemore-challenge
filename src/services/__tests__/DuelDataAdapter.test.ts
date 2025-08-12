/**
 * Unit tests for DuelDataAdapter
 */

import { DuelDataAdapterFactory } from "../DuelDataAdapter";
import { UnifiedDuel, DuelConfig } from "../../types/unified";

describe("DuelDataAdapter", () => {
  beforeEach(() => {
    DuelDataAdapterFactory.reset();
  });

  describe("MockDuelAdapter", () => {
    it("should create a duel successfully", async () => {
      const adapter = DuelDataAdapterFactory.getMockAdapter();

      const config: DuelConfig = {
        exercise: "pushups",
        matchType: "public",
        windowSec: 1800, // 30 minutes
      };

      const result = await adapter.createDuel(config);

      expect(result.success).toBe(true);
      expect(result.duel).toBeDefined();
      expect(result.duel?.exercise).toBe("pushups");
      expect(result.duel?.status).toBe("pending");
      expect(result.duelId).toBeDefined();
    });

    it("should join a duel successfully", async () => {
      const adapter = DuelDataAdapterFactory.getMockAdapter();

      // First create a duel
      const config: DuelConfig = {
        exercise: "squats",
        matchType: "public",
        windowSec: 1800,
      };

      const createResult = await adapter.createDuel(config);
      expect(createResult.success).toBe(true);

      // Then join it
      const joinResult = await adapter.joinDuel(createResult.duelId!);

      expect(joinResult.success).toBe(true);
      expect(joinResult.duel?.status).toBe("active");
      expect(joinResult.duel?.guest).toBeDefined();
    });

    it("should submit score successfully", async () => {
      const adapter = DuelDataAdapterFactory.getMockAdapter();

      // Create and join a duel
      const config: DuelConfig = {
        exercise: "situps",
        matchType: "public",
        windowSec: 1800,
      };

      const createResult = await adapter.createDuel(config);
      const joinResult = await adapter.joinDuel(createResult.duelId!);

      // Submit score
      const submitResult = await adapter.submitScore(createResult.duelId!, 25);

      expect(submitResult.success).toBe(true);
      expect(submitResult.duel?.hostScore).toBe(25);
    });

    it("should handle duel subscription", (done) => {
      const adapter = DuelDataAdapterFactory.getMockAdapter();

      const config: DuelConfig = {
        exercise: "planks",
        matchType: "public",
        windowSec: 1800,
      };

      adapter.createDuel(config).then((createResult) => {
        const unsubscribe = adapter.subscribeToDuel(
          createResult.duelId!,
          (duel) => {
            if (duel) {
              expect(duel.id).toBe(createResult.duelId);
              expect(duel.exercise).toBe("planks");
              unsubscribe();
              done();
            }
          }
        );
      });
    });

    it("should return correct data source", () => {
      const adapter = DuelDataAdapterFactory.getMockAdapter();
      expect(adapter.getDataSource()).toBe("mock");
      expect(adapter.isOnline()).toBe(false);
    });

    it("should handle errors gracefully", async () => {
      const adapter = DuelDataAdapterFactory.getMockAdapter();

      // Try to join non-existent duel
      const joinResult = await adapter.joinDuel("non-existent-id");
      expect(joinResult.success).toBe(false);
      expect(joinResult.error).toBeDefined();

      // Try to submit score to non-existent duel
      const submitResult = await adapter.submitScore("non-existent-id", 10);
      expect(submitResult.success).toBe(false);
      expect(submitResult.error).toBeDefined();
    });
  });

  describe("DuelDataAdapterFactory", () => {
    it("should return mock adapter when offline", () => {
      const adapter = DuelDataAdapterFactory.getAdapter(true); // Force offline
      expect(adapter.getDataSource()).toBe("mock");
    });

    it("should return same instance on multiple calls", () => {
      const adapter1 = DuelDataAdapterFactory.getMockAdapter();
      const adapter2 = DuelDataAdapterFactory.getMockAdapter();
      expect(adapter1).toBe(adapter2);
    });
  });
});
