import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Find potential matches for a user
export const findMatches = query({
  args: {
    subject: v.optional(v.string()),
    university: v.optional(v.string()),
    urgencyLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get user's learning subjects
    const userLearningSubjects = await ctx.db
      .query("userSubjects")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => q.eq(q.field("type"), "learn"))
      .collect();

    if (userLearningSubjects.length === 0) return [];

    const matches = [];

    for (const learningSubject of userLearningSubjects) {
      // Skip if subject filter doesn't match
      if (args.subject && learningSubject.subject !== args.subject) continue;

      // Find users who can teach this subject
      let teachingQuery = ctx.db
        .query("userSubjects")
        .withIndex("by_subject_type", (q) => 
          q.eq("subject", learningSubject.subject).eq("type", "teach")
        );

      // Apply urgency filter if specified
      if (args.urgencyLevel) {
        teachingQuery = teachingQuery.filter((q) => 
          q.eq(q.field("urgencyLevel"), args.urgencyLevel)
        );
      }

      const potentialTeachers = await teachingQuery.collect();

      for (const teacher of potentialTeachers) {
        // Don't match with yourself
        if (teacher.userId === userId) continue;

        // Get teacher's profile
        const teacherProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user", (q) => q.eq("userId", teacher.userId))
          .unique();

        if (!teacherProfile) continue;

        // Apply university filter if specified
        if (args.university && teacherProfile.university !== args.university) continue;

        // Check if there's already a match between these users for this subject
        const existingMatch = await ctx.db
          .query("matches")
          .withIndex("by_requester", (q) => q.eq("requesterId", userId))
          .filter((q) => 
            q.and(
              q.eq(q.field("helperId"), teacher.userId),
              q.eq(q.field("subject"), learningSubject.subject)
            )
          )
          .first();

        if (existingMatch) continue;

        matches.push({
          teacherProfile,
          teacherSubject: teacher,
          learningSubject,
          compatibilityScore: calculateCompatibilityScore(learningSubject, teacher, teacherProfile),
        });
      }
    }

    // Sort by compatibility score
    return matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  },
});

// Calculate compatibility score between learner and teacher
function calculateCompatibilityScore(learningSubject: any, teachingSubject: any, teacherProfile: any): number {
  let score = 0;

  // Base score
  score += 50;

  // Urgency match bonus
  if (learningSubject.urgencyLevel === teachingSubject.urgencyLevel) {
    score += 20;
  }

  // Proficiency level compatibility
  const proficiencyLevels = { beginner: 1, intermediate: 2, advanced: 3 };
  const learnerLevel = proficiencyLevels[learningSubject.proficiencyLevel as keyof typeof proficiencyLevels];
  const teacherLevel = proficiencyLevels[teachingSubject.proficiencyLevel as keyof typeof proficiencyLevels];
  
  if (teacherLevel >= learnerLevel) {
    score += 15;
  }

  // Reputation bonus
  score += Math.min(teacherProfile.reputation * 5, 15);

  // Tag overlap bonus
  const commonTags = learningSubject.tags.filter((tag: string) => 
    teachingSubject.tags.includes(tag)
  );
  score += commonTags.length * 3;

  return Math.min(score, 100);
}

// Send match request
export const sendMatchRequest = mutation({
  args: {
    helperId: v.id("users"),
    subject: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if match already exists
    const existingMatch = await ctx.db
      .query("matches")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId))
      .filter((q) => 
        q.and(
          q.eq(q.field("helperId"), args.helperId),
          q.eq(q.field("subject"), args.subject)
        )
      )
      .first();

    if (existingMatch) {
      throw new Error("Match request already exists");
    }

    const matchId = await ctx.db.insert("matches", {
      requesterId: userId,
      helperId: args.helperId,
      subject: args.subject,
      status: "pending",
      message: args.message,
    });

    // Create notification for helper
    await ctx.db.insert("notifications", {
      userId: args.helperId,
      type: "match_request",
      title: "New Match Request",
      message: `Someone wants to learn ${args.subject} from you!`,
      isRead: false,
      relatedId: matchId,
    });

    return matchId;
  },
});

// Get user's matches
export const getUserMatches = query({
  args: { status: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let requestedMatches = ctx.db
      .query("matches")
      .withIndex("by_requester", (q) => q.eq("requesterId", userId));

    let helpingMatches = ctx.db
      .query("matches")
      .withIndex("by_helper", (q) => q.eq("helperId", userId));

    if (args.status) {
      requestedMatches = requestedMatches.filter((q) => q.eq(q.field("status"), args.status));
      helpingMatches = helpingMatches.filter((q) => q.eq(q.field("status"), args.status));
    }

    const [requested, helping] = await Promise.all([
      requestedMatches.collect(),
      helpingMatches.collect(),
    ]);

    // Get user profiles for each match
    const enrichedMatches = [];

    for (const match of requested) {
      const helperProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", match.helperId))
        .unique();

      enrichedMatches.push({
        ...match,
        type: "requested",
        otherUser: helperProfile,
      });
    }

    for (const match of helping) {
      const requesterProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", match.requesterId))
        .unique();

      enrichedMatches.push({
        ...match,
        type: "helping",
        otherUser: requesterProfile,
      });
    }

    return enrichedMatches.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Respond to match request
export const respondToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    response: v.union(v.literal("accept"), v.literal("decline")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const match = await ctx.db.get(args.matchId);
    if (!match || match.helperId !== userId) {
      throw new Error("Match not found or unauthorized");
    }

    if (match.status !== "pending") {
      throw new Error("Match request already responded to");
    }

    const newStatus = args.response === "accept" ? "accepted" : "declined";
    await ctx.db.patch(args.matchId, { status: newStatus });

    // Create notification for requester
    await ctx.db.insert("notifications", {
      userId: match.requesterId,
      type: "match_accepted",
      title: args.response === "accept" ? "Match Accepted!" : "Match Declined",
      message: args.response === "accept" 
        ? `Your request to learn ${match.subject} has been accepted!`
        : `Your request to learn ${match.subject} was declined.`,
      isRead: false,
      relatedId: args.matchId,
    });

    // Award points for accepting a match
    if (args.response === "accept") {
      const helperProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .unique();

      if (helperProfile) {
        await ctx.db.patch(helperProfile._id, {
          points: helperProfile.points + 10,
        });
      }
    }

    return newStatus;
  },
});

// Schedule a session
export const scheduleSession = mutation({
  args: {
    matchId: v.id("matches"),
    scheduledTime: v.number(),
    meetingLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const match = await ctx.db.get(args.matchId);
    if (!match || (match.requesterId !== userId && match.helperId !== userId)) {
      throw new Error("Match not found or unauthorized");
    }

    if (match.status !== "accepted") {
      throw new Error("Match must be accepted before scheduling");
    }

    await ctx.db.patch(args.matchId, {
      scheduledTime: args.scheduledTime,
      meetingLink: args.meetingLink,
    });

    // Create study session
    await ctx.db.insert("studySessions", {
      matchId: args.matchId,
      hostId: userId,
      participantIds: [match.requesterId, match.helperId],
      subject: match.subject,
      title: `${match.subject} Study Session`,
      scheduledTime: args.scheduledTime,
      duration: 60, // Default 1 hour
      meetingLink: args.meetingLink,
      status: "scheduled",
    });

    // Create notifications for both users
    const otherUserId = match.requesterId === userId ? match.helperId : match.requesterId;
    
    await ctx.db.insert("notifications", {
      userId: otherUserId,
      type: "session_reminder",
      title: "Session Scheduled",
      message: `A study session for ${match.subject} has been scheduled.`,
      isRead: false,
      relatedId: args.matchId,
    });

    return args.matchId;
  },
});
