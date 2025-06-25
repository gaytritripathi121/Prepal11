import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get resources with search and filters
export const getResources = query({
  args: {
    subject: v.optional(v.string()),
    university: v.optional(v.string()),
    yearOfStudy: v.optional(v.string()),
    searchQuery: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;

    let resourcesQuery;

    if (args.searchQuery) {
      resourcesQuery = ctx.db
        .query("resources")
        .withSearchIndex("search_resources", (q) => {
          let searchQ = q.search("title", args.searchQuery!);
          if (args.subject) searchQ = searchQ.eq("subject", args.subject);
          if (args.university) searchQ = searchQ.eq("university", args.university);
          if (args.yearOfStudy) searchQ = searchQ.eq("yearOfStudy", args.yearOfStudy);
          return searchQ;
        });
    } else {
      if (args.subject) {
        resourcesQuery = ctx.db.query("resources")
          .withIndex("by_subject", (q) => q.eq("subject", args.subject!));
      } else {
        resourcesQuery = ctx.db.query("resources");
      }
    }

    let resources;
    if (args.searchQuery) {
      resources = await resourcesQuery
        .filter((q) => q.eq(q.field("isPublic"), true))
        .take(limit);
    } else if (args.subject) {
      resources = await resourcesQuery
        .filter((q) => q.eq(q.field("isPublic"), true))
        .take(limit);
    } else {
      resources = await ctx.db.query("resources")
        .filter((q) => q.eq(q.field("isPublic"), true))
        .order("desc")
        .take(limit);
    }

    // Enrich resources with uploader info and download URL
    const enrichedResources = [];
    for (const resource of resources) {
      const uploaderProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user", (q) => q.eq("userId", resource.uploaderId))
        .unique();

      const downloadUrl = await ctx.storage.getUrl(resource.fileId);

      enrichedResources.push({
        ...resource,
        uploader: uploaderProfile,
        downloadUrl,
      });
    }

    return enrichedResources;
  },
});

// Upload a resource
export const uploadResource = mutation({
  args: {
    title: v.string(),
    description: v.string(),
    subject: v.string(),
    fileId: v.id("_storage"),
    fileType: v.string(),
    yearOfStudy: v.optional(v.string()),
    tags: v.array(v.string()),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    const resourceId = await ctx.db.insert("resources", {
      uploaderId: userId,
      title: args.title,
      description: args.description,
      subject: args.subject,
      fileId: args.fileId,
      fileType: args.fileType,
      university: userProfile?.university,
      yearOfStudy: args.yearOfStudy,
      tags: args.tags,
      downloads: 0,
      rating: 0,
      isPublic: args.isPublic,
    });

    // Award points for sharing resources
    if (userProfile) {
      await ctx.db.patch(userProfile._id, {
        points: userProfile.points + 15,
      });
    }

    return resourceId;
  },
});

// Download a resource (increment download count)
export const downloadResource = mutation({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const resource = await ctx.db.get(args.resourceId);
    if (!resource) throw new Error("Resource not found");

    await ctx.db.patch(args.resourceId, {
      downloads: resource.downloads + 1,
    });

    return await ctx.storage.getUrl(resource.fileId);
  },
});

// Get user's uploaded resources
export const getUserResources = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const resources = await ctx.db
      .query("resources")
      .withIndex("by_uploader", (q) => q.eq("uploaderId", userId))
      .order("desc")
      .collect();

    // Add download URLs
    const enrichedResources = [];
    for (const resource of resources) {
      const downloadUrl = await ctx.storage.getUrl(resource.fileId);
      enrichedResources.push({
        ...resource,
        downloadUrl,
      });
    }

    return enrichedResources;
  },
});
