import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get forum posts with search and filters
export const getForumPosts = query({
  args: {
    subject: v.optional(v.string()),
    university: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let postsQuery;

    if (args.searchQuery) {
      postsQuery = ctx.db
        .query("forumPosts")
        .withSearchIndex("search_posts", (q) => {
          let searchQ = q.search("content", args.searchQuery!);
          if (args.subject) searchQ = searchQ.eq("subject", args.subject);
          if (args.university) searchQ = searchQ.eq("university", args.university);
          return searchQ;
        });
    } else {
      if (args.subject) {
        postsQuery = ctx.db.query("forumPosts")
          .withIndex("by_subject", (q) => q.eq("subject", args.subject!));
      } else {
        postsQuery = ctx.db.query("forumPosts");
      }
    }

    let posts;
    if (args.searchQuery) {
      posts = await postsQuery.take(limit);
    } else if (args.subject) {
      posts = await postsQuery.take(limit);
    } else {
      posts = await ctx.db.query("forumPosts").order("desc").take(limit);
    }

    // Enrich posts with author info and reply count
    const enrichedPosts = [];
    for (const post of posts) {
      const authorProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", post.authorId))
        .unique();

      const replyCount = await ctx.db
        .query("forumReplies")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect()
        .then(replies => replies.length);

      enrichedPosts.push({
        ...post,
        author: post.isAnonymous ? null : authorProfile,
        replyCount,
      });
    }

    return enrichedPosts;
  },
});

// Create a forum post
export const createForumPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    subject: v.string(),
    tags: v.array(v.string()),
    isAnonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const postId = await ctx.db.insert("forumPosts", {
      authorId: userId,
      title: args.title,
      content: args.content,
      subject: args.subject,
      university: userProfile?.university,
      tags: args.tags,
      upvotes: 0,
      downvotes: 0,
      isAnonymous: args.isAnonymous,
    });

    // Award points for creating a post
    if (userProfile) {
      await ctx.db.patch(userProfile._id, {
        points: userProfile.points + 5,
      });
    }

    return postId;
  },
});

// Get post replies
export const getPostReplies = query({
  args: { postId: v.id("forumPosts") },
  handler: async (ctx, args) => {
    const replies = await ctx.db
      .query("forumReplies")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    // Enrich replies with author info
    const enrichedReplies = [];
    for (const reply of replies) {
      const authorProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", reply.authorId))
        .unique();

      enrichedReplies.push({
        ...reply,
        author: reply.isAnonymous ? null : authorProfile,
      });
    }

    return enrichedReplies;
  },
});

// Create a reply to a post
export const createReply = mutation({
  args: {
    postId: v.id("forumPosts"),
    content: v.string(),
    isAnonymous: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const replyId = await ctx.db.insert("forumReplies", {
      postId: args.postId,
      authorId: userId,
      content: args.content,
      upvotes: 0,
      downvotes: 0,
      isAnonymous: args.isAnonymous,
    });

    // Award points for replying
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (userProfile) {
      await ctx.db.patch(userProfile._id, {
        points: userProfile.points + 2,
      });
    }

    return replyId;
  },
});

// Vote on a post
export const voteOnPost = mutation({
  args: {
    postId: v.id("forumPosts"),
    voteType: v.union(v.literal("upvote"), v.literal("downvote")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    // For simplicity, we'll just increment the vote count
    // In a real app, you'd want to track individual votes to prevent duplicate voting
    if (args.voteType === "upvote") {
      await ctx.db.patch(args.postId, {
        upvotes: post.upvotes + 1,
      });
    } else {
      await ctx.db.patch(args.postId, {
        downvotes: post.downvotes + 1,
      });
    }

    return args.postId;
  },
});

// Vote on a reply
export const voteOnReply = mutation({
  args: {
    replyId: v.id("forumReplies"),
    voteType: v.union(v.literal("upvote"), v.literal("downvote")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const reply = await ctx.db.get(args.replyId);
    if (!reply) throw new Error("Reply not found");

    if (args.voteType === "upvote") {
      await ctx.db.patch(args.replyId, {
        upvotes: reply.upvotes + 1,
      });
    } else {
      await ctx.db.patch(args.replyId, {
        downvotes: reply.downvotes + 1,
      });
    }

    return args.replyId;
  },
});
