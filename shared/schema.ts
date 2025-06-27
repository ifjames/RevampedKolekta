import { z } from "zod";

// Firebase Firestore types
export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

// User schema
export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(["user", "verified", "admin"]).default("user"),
  verified: z.boolean().default(false),
  rating: z.number().min(0).max(5).default(5.0),
  completedExchanges: z.number().default(0),
  noShowCount: z.number().default(0),
  location: z.object({
    geohash: z.string(),
    lat: z.number(),
    lng: z.number()
  }).optional(),
  favorites: z.array(z.string()).default([]),
  createdAt: z.date(),
  lastActive: z.date().optional()
});

export const insertUserSchema = userSchema.omit({ id: true, createdAt: true });

// Post schema
export const postSchema = z.object({
  id: z.string(),
  userId: z.string(),
  giveAmount: z.number().positive(),
  giveType: z.enum(["bill", "coins"]),
  needAmount: z.number().positive(),
  needBreakdown: z.array(z.number()).optional(),
  needType: z.enum(["bill", "coins"]),
  notes: z.string().optional(),
  location: z.object({
    geohash: z.string(),
    lat: z.number(),
    lng: z.number()
  }),
  status: z.enum(["active", "matched", "completed", "cancelled"]).default("active"),
  timestamp: z.date(),
  expiresAt: z.date().optional(),
  matchId: z.string().optional()
});

export const insertPostSchema = postSchema.omit({ id: true, timestamp: true });

// Match schema
export const matchSchema = z.object({
  id: z.string(),
  userA: z.string(),
  userB: z.string(),
  postAId: z.string(),
  postBId: z.string(),
  meetupTime: z.date().optional(),
  locationChosen: z.string().optional(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no-show"]).default("pending"),
  chatOpened: z.boolean().default(false),
  ratingA: z.number().min(1).max(5).optional(),
  ratingB: z.number().min(1).max(5).optional(),
  createdAt: z.date(),
  completedAt: z.date().optional()
});

export const insertMatchSchema = matchSchema.omit({ id: true, createdAt: true });

// Chat message schema
export const chatMessageSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  sender: z.string(),
  text: z.string().max(500),
  timestamp: z.date(),
  read: z.boolean().default(false)
});

export const insertChatMessageSchema = chatMessageSchema.omit({ id: true, timestamp: true });

// Chat schema
export const chatSchema = z.object({
  id: z.string(),
  matchId: z.string(),
  participants: z.array(z.string()).length(2),
  messages: z.array(chatMessageSchema),
  expiresAt: z.date(),
  createdAt: z.date()
});

export const insertChatSchema = chatSchema.omit({ id: true, createdAt: true, messages: true });

// Report schema
export const reportSchema = z.object({
  id: z.string(),
  reportedUser: z.string(),
  reporter: z.string(),
  matchId: z.string().optional(),
  issue: z.string(),
  description: z.string().optional(),
  evidence: z.array(z.string()).optional(),
  status: z.enum(["pending", "investigating", "resolved", "dismissed"]).default("pending"),
  createdAt: z.date(),
  resolvedAt: z.date().optional()
});

export const insertReportSchema = reportSchema.omit({ id: true, createdAt: true });

// Notification schema
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: z.enum([
    "match_found",
    "match_confirmed", 
    "meetup_reminder",
    "exchange_completed",
    "rating_received",
    "no_show_reported",
    "verification_approved"
  ]),
  title: z.string(),
  message: z.string(),
  data: z.record(z.any()).optional(),
  read: z.boolean().default(false),
  deleted: z.boolean().default(false),
  createdAt: z.date()
});

export const insertNotificationSchema = notificationSchema.omit({ id: true, createdAt: true });

// Exported types
export type User = z.infer<typeof userSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Post = z.infer<typeof postSchema>;
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Match = z.infer<typeof matchSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type Chat = z.infer<typeof chatSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type Report = z.infer<typeof reportSchema>;
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Notification = z.infer<typeof notificationSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
