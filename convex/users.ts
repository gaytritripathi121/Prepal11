import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get current user profile
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return { user, profile };
  },
});

// Create or update user profile
export const createOrUpdateProfile = mutation({
  args: {
    fullName: v.string(),
    username: v.string(),
    university: v.string(),
    studentId: v.string(),
    yearOfStudy: v.string(),
    stateRegion: v.string(),
    bio: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if username is already taken
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .first();

    if (existingProfile && existingProfile.userId !== userId) {
      throw new Error("Username already taken");
    }

    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (currentProfile) {
      await ctx.db.patch(currentProfile._id, {
        fullName: args.fullName,
        username: args.username,
        university: args.university,
        studentId: args.studentId,
        yearOfStudy: args.yearOfStudy,
        stateRegion: args.stateRegion,
        bio: args.bio,
        lastActive: Date.now(),
      });
      return currentProfile._id;
    } else {
      return await ctx.db.insert("userProfiles", {
        userId,
        fullName: args.fullName,
        username: args.username,
        university: args.university,
        studentId: args.studentId,
        yearOfStudy: args.yearOfStudy,
        stateRegion: args.stateRegion,
        bio: args.bio,
        reputation: 0,
        totalRatings: 0,
        points: 0,
        isAnonymous: false,
        lastActive: Date.now(),
      });
    }
  },
});

// Get user subjects (what they teach/learn)
export const getUserSubjects = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUserId = args.userId || currentUserId;
    
    if (!targetUserId) return [];

    return await ctx.db
      .query("userSubjects")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
  },
});

// Add or update user subject
export const addOrUpdateSubject = mutation({
  args: {
    subject: v.string(),
    type: v.union(v.literal("teach"), v.literal("learn")),
    proficiencyLevel: v.union(
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    urgencyLevel: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high")
    ),
    examDate: v.optional(v.number()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if subject already exists for this user and type
    const existing = await ctx.db
      .query("userSubjects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("subject"), args.subject),
          q.eq(q.field("type"), args.type)
        )
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        proficiencyLevel: args.proficiencyLevel,
        urgencyLevel: args.urgencyLevel,
        examDate: args.examDate,
        tags: args.tags,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("userSubjects", {
        userId,
        subject: args.subject,
        type: args.type,
        proficiencyLevel: args.proficiencyLevel,
        urgencyLevel: args.urgencyLevel,
        examDate: args.examDate,
        tags: args.tags,
      });
    }
  },
});

// Remove user subject
export const removeSubject = mutation({
  args: { subjectId: v.id("userSubjects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const subject = await ctx.db.get(args.subjectId);
    if (!subject || subject.userId !== userId) {
      throw new Error("Subject not found or unauthorized");
    }

    await ctx.db.delete(args.subjectId);
  },
});

// Get user availability
export const getUserAvailability = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    const targetUserId = args.userId || currentUserId;
    
    if (!targetUserId) return [];

    return await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", targetUserId))
      .collect();
  },
});

// Set user availability
export const setAvailability = mutation({
  args: {
    schedule: v.array(v.object({
      dayOfWeek: v.number(),
      startTime: v.string(),
      endTime: v.string(),
      timezone: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Remove existing availability
    const existing = await ctx.db
      .query("availability")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    for (const slot of existing) {
      await ctx.db.delete(slot._id);
    }

    // Add new availability
    for (const slot of args.schedule) {
      await ctx.db.insert("availability", {
        userId,
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timezone: slot.timezone,
      });
    }
  },
});

// Toggle anonymous mode
export const toggleAnonymousMode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      isAnonymous: !profile.isAnonymous,
    });

    return !profile.isAnonymous;
  },
});

// Get leaderboard
export const getLeaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_points", (q) => q.gt("points", 0))
      .order("desc")
      .take(limit);
  },
});
