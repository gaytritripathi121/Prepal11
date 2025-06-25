import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Rate a user after a session
export const rateUser = mutation({
  args: {
    ratedUserId: v.id("users"),
    matchId: v.id("matches"),
    rating: v.number(),
    feedback: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate rating
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    // Check if user has already rated this match
    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .filter((q) => q.eq(q.field("raterId"), userId))
      .first();

    if (existingRating) {
      throw new Error("You have already rated this session");
    }

    // Verify the match exists and user is part of it
    const match = await ctx.db.get(args.matchId);
    if (!match || (match.requesterId !== userId && match.helperId !== userId)) {
      throw new Error("Match not found or unauthorized");
    }

    // Create the rating
    await ctx.db.insert("ratings", {
      raterId: userId,
      ratedUserId: args.ratedUserId,
      matchId: args.matchId,
      rating: args.rating,
      feedback: args.feedback,
    });

    // Update the rated user's reputation
    const ratedUserProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.ratedUserId))
      .unique();

    if (ratedUserProfile) {
      const newTotalRatings = ratedUserProfile.totalRatings + 1;
      const newReputation = 
        (ratedUserProfile.reputation * ratedUserProfile.totalRatings + args.rating) / newTotalRatings;

      await ctx.db.patch(ratedUserProfile._id, {
        reputation: newReputation,
        totalRatings: newTotalRatings,
      });

      // Award points for receiving good ratings
      if (args.rating >= 4) {
        await ctx.db.patch(ratedUserProfile._id, {
          points: ratedUserProfile.points + (args.rating * 2),
        });
      }
    }

    return args.matchId;
  },
});

// Get ratings for a user
export const getUserRatings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("ratings")
      .withIndex("by_rated_user", (q) => q.eq("ratedUserId", args.userId))
      .order("desc")
      .collect();

    // Enrich with rater profiles
    const enrichedRatings = [];
    for (const rating of ratings) {
      const raterProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", rating.raterId))
        .unique();

      enrichedRatings.push({
        ...rating,
        rater: raterProfile,
      });
    }

    return enrichedRatings;
  },
});

// Check if user can rate a match
export const canRateMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const match = await ctx.db.get(args.matchId);
    if (!match || match.status !== "completed") return false;

    if (match.requesterId !== userId && match.helperId !== userId) return false;

    // Check if already rated
    const existingRating = await ctx.db
      .query("ratings")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .filter((q) => q.eq(q.field("raterId"), userId))
      .first();

    return !existingRating;
  },
});
