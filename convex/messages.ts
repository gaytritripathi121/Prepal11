import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get messages for a match
export const getMatchMessages = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Verify user is part of this match
    const match = await ctx.db.get(args.matchId);
    if (!match || (match.requesterId !== userId && match.helperId !== userId)) {
      throw new Error("Unauthorized");
    }

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .order("asc")
      .collect();

    // Get sender profiles
    const enrichedMessages = [];
    for (const message of messages) {
      const senderProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", message.senderId))
        .unique();

      enrichedMessages.push({
        ...message,
        sender: senderProfile,
        fileUrl: message.fileId ? await ctx.storage.getUrl(message.fileId) : null,
      });
    }

    return enrichedMessages;
  },
});

// Send a message
export const sendMessage = mutation({
  args: {
    matchId: v.id("matches"),
    content: v.string(),
    messageType: v.union(v.literal("text"), v.literal("file")),
    fileId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify user is part of this match
    const match = await ctx.db.get(args.matchId);
    if (!match || (match.requesterId !== userId && match.helperId !== userId)) {
      throw new Error("Unauthorized");
    }

    const messageId = await ctx.db.insert("messages", {
      matchId: args.matchId,
      senderId: userId,
      content: args.content,
      messageType: args.messageType,
      fileId: args.fileId,
      isRead: false,
    });

    // Create notification for the other user
    const otherUserId = match.requesterId === userId ? match.helperId : match.requesterId;
    
    await ctx.db.insert("notifications", {
      userId: otherUserId,
      type: "new_message",
      title: "New Message",
      message: `You have a new message about ${match.subject}`,
      isRead: false,
      relatedId: args.matchId,
    });

    return messageId;
  },
});

// Mark messages as read
export const markMessagesAsRead = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify user is part of this match
    const match = await ctx.db.get(args.matchId);
    if (!match || (match.requesterId !== userId && match.helperId !== userId)) {
      throw new Error("Unauthorized");
    }

    // Get unread messages from the other user
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .filter((q) => 
        q.and(
          q.neq(q.field("senderId"), userId),
          q.eq(q.field("isRead"), false)
        )
      )
      .collect();

    // Mark them as read
    for (const message of messages) {
      await ctx.db.patch(message._id, { isRead: true });
    }

    return messages.length;
  },
});

// Get unread message count for user
export const getUnreadMessageCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    // Get all matches for this user
    const [requestedMatches, helpingMatches] = await Promise.all([
      ctx.db
        .query("matches")
        .withIndex("by_requester", (q) => q.eq("requesterId", userId))
        .collect(),
      ctx.db
        .query("matches")
        .withIndex("by_helper", (q) => q.eq("helperId", userId))
        .collect(),
    ]);

    const allMatches = [...requestedMatches, ...helpingMatches];
    let totalUnread = 0;

    for (const match of allMatches) {
      const unreadMessages = await ctx.db
        .query("messages")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .filter((q) => 
          q.and(
            q.neq(q.field("senderId"), userId),
            q.eq(q.field("isRead"), false)
          )
        )
        .collect();

      totalUnread += unreadMessages.length;
    }

    return totalUnread;
  },
});

// Generate upload URL for file sharing
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});
