import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get user's exams
export const getUserExams = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("exams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("asc")
      .collect();
  },
});

// Add an exam
export const addExam = mutation({
  args: {
    examName: v.string(),
    subject: v.string(),
    examDate: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    return await ctx.db.insert("exams", {
      userId,
      examName: args.examName,
      subject: args.subject,
      examDate: args.examDate,
      description: args.description,
      isCompleted: false,
    });
  },
});

// Update exam
export const updateExam = mutation({
  args: {
    examId: v.id("exams"),
    examName: v.optional(v.string()),
    subject: v.optional(v.string()),
    examDate: v.optional(v.number()),
    description: v.optional(v.string()),
    isCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const exam = await ctx.db.get(args.examId);
    if (!exam || exam.userId !== userId) {
      throw new Error("Exam not found or unauthorized");
    }

    const updates: any = {};
    if (args.examName !== undefined) updates.examName = args.examName;
    if (args.subject !== undefined) updates.subject = args.subject;
    if (args.examDate !== undefined) updates.examDate = args.examDate;
    if (args.description !== undefined) updates.description = args.description;
    if (args.isCompleted !== undefined) updates.isCompleted = args.isCompleted;

    await ctx.db.patch(args.examId, updates);
    return args.examId;
  },
});

// Delete exam
export const deleteExam = mutation({
  args: { examId: v.id("exams") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const exam = await ctx.db.get(args.examId);
    if (!exam || exam.userId !== userId) {
      throw new Error("Exam not found or unauthorized");
    }

    await ctx.db.delete(args.examId);
  },
});

// Get upcoming exams (within next 30 days)
export const getUpcomingExams = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const now = Date.now();
    const thirtyDaysFromNow = now + (30 * 24 * 60 * 60 * 1000);

    return await ctx.db
      .query("exams")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) => 
        q.and(
          q.gte(q.field("examDate"), now),
          q.lte(q.field("examDate"), thirtyDaysFromNow),
          q.eq(q.field("isCompleted"), false)
        )
      )
      .order("asc")
      .collect();
  },
});
