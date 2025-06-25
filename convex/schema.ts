import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // User profiles with extended information
  userProfiles: defineTable({
    userId: v.id("users"),
    fullName: v.string(),
    username: v.string(),
    university: v.string(),
    studentId: v.string(),
    yearOfStudy: v.string(),
    stateRegion: v.string(),
    profilePicture: v.optional(v.id("_storage")),
    bio: v.optional(v.string()),
    reputation: v.number(), // Average rating
    totalRatings: v.number(),
    points: v.number(), // Gamification points
    isAnonymous: v.boolean(),
    lastActive: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_username", ["username"])
    .index("by_university", ["university"])
    .index("by_points", ["points"]),

  // Subjects that users can teach or want to learn
  userSubjects: defineTable({
    userId: v.id("users"),
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
  })
    .index("by_user", ["userId"])
    .index("by_subject_type", ["subject", "type"])
    .index("by_urgency", ["urgencyLevel"]),

  // User availability schedule
  availability: defineTable({
    userId: v.id("users"),
    dayOfWeek: v.number(), // 0-6 (Sunday-Saturday)
    startTime: v.string(), // "HH:MM" format
    endTime: v.string(),
    timezone: v.string(),
  }).index("by_user", ["userId"]),

  // Matches between users
  matches: defineTable({
    requesterId: v.id("users"),
    helperId: v.id("users"),
    subject: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("completed")
    ),
    message: v.optional(v.string()),
    scheduledTime: v.optional(v.number()),
    meetingLink: v.optional(v.string()),
  })
    .index("by_requester", ["requesterId"])
    .index("by_helper", ["helperId"])
    .index("by_status", ["status"]),

  // Chat messages
  messages: defineTable({
    matchId: v.id("matches"),
    senderId: v.id("users"),
    content: v.string(),
    messageType: v.union(v.literal("text"), v.literal("file")),
    fileId: v.optional(v.id("_storage")),
    isRead: v.boolean(),
  })
    .index("by_match", ["matchId"])
    .index("by_sender", ["senderId"]),

  // Ratings and reviews
  ratings: defineTable({
    raterId: v.id("users"),
    ratedUserId: v.id("users"),
    matchId: v.id("matches"),
    rating: v.number(), // 1-5
    feedback: v.optional(v.string()),
  })
    .index("by_rated_user", ["ratedUserId"])
    .index("by_match", ["matchId"]),

  // Discussion forum posts
  forumPosts: defineTable({
    authorId: v.id("users"),
    title: v.string(),
    content: v.string(),
    subject: v.string(),
    university: v.optional(v.string()),
    tags: v.array(v.string()),
    upvotes: v.number(),
    downvotes: v.number(),
    isAnonymous: v.boolean(),
  })
    .index("by_author", ["authorId"])
    .index("by_subject", ["subject"])
    .searchIndex("search_posts", {
      searchField: "content",
      filterFields: ["subject", "university"],
    }),

  // Forum post replies
  forumReplies: defineTable({
    postId: v.id("forumPosts"),
    authorId: v.id("users"),
    content: v.string(),
    upvotes: v.number(),
    downvotes: v.number(),
    isAnonymous: v.boolean(),
  })
    .index("by_post", ["postId"])
    .index("by_author", ["authorId"]),

  // Shared resources/notes
  resources: defineTable({
    uploaderId: v.id("users"),
    title: v.string(),
    description: v.string(),
    subject: v.string(),
    fileId: v.id("_storage"),
    fileType: v.string(),
    university: v.optional(v.string()),
    yearOfStudy: v.optional(v.string()),
    tags: v.array(v.string()),
    downloads: v.number(),
    rating: v.number(),
    isPublic: v.boolean(),
  })
    .index("by_uploader", ["uploaderId"])
    .index("by_subject", ["subject"])
    .searchIndex("search_resources", {
      searchField: "title",
      filterFields: ["subject", "university", "yearOfStudy"],
    }),

  // Exam countdown tracker
  exams: defineTable({
    userId: v.id("users"),
    examName: v.string(),
    subject: v.string(),
    examDate: v.number(),
    description: v.optional(v.string()),
    isCompleted: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_date", ["examDate"]),

  // Notifications
  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("match_request"),
      v.literal("match_accepted"),
      v.literal("new_message"),
      v.literal("session_reminder"),
      v.literal("exam_reminder")
    ),
    title: v.string(),
    message: v.string(),
    isRead: v.boolean(),
    relatedId: v.optional(v.string()), // ID of related match, message, etc.
  }).index("by_user", ["userId"]),

  // Study sessions
  studySessions: defineTable({
    matchId: v.id("matches"),
    hostId: v.id("users"),
    participantIds: v.array(v.id("users")),
    subject: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    scheduledTime: v.number(),
    duration: v.number(), // in minutes
    meetingLink: v.optional(v.string()),
    status: v.union(
      v.literal("scheduled"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  })
    .index("by_host", ["hostId"])
    .index("by_scheduled_time", ["scheduledTime"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
