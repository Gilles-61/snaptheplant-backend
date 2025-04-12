import { pgTable, text, serial, integer, boolean, timestamp, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  subscriptionType: text("subscription_type").default("free").notNull(),
  identificationsRemaining: integer("identifications_remaining").default(5).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  trialEndDate: timestamp("trial_end_date"),
  isBetaTester: boolean("is_beta_tester").default(false),
});

// Plants table
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  scientificName: text("scientific_name"),
  imageUrl: text("image_url"),
  dateAdded: timestamp("date_added").defaultNow().notNull(),
  waterFrequency: integer("water_frequency").notNull(), // in days
  lastWatered: timestamp("last_watered"),
  fertilizeFrequency: integer("fertilize_frequency"), // in days
  lastFertilized: timestamp("last_fertilized"),
  lightNeeds: text("light_needs"),
  notes: text("notes"),
  careHealth: real("care_health").default(100),
  isPublic: boolean("is_public").default(false),
});

// Care actions table
export const careActions = pgTable("care_actions", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").notNull(),
  userId: integer("user_id").notNull(),
  actionType: text("action_type").notNull(), // water, fertilize, repot, etc.
  dueDate: timestamp("due_date").notNull(),
  completedAt: timestamp("completed_at"),
  isCompleted: boolean("is_completed").default(false),
});

// Community shares table
export const communityShares = pgTable("community_shares", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  plantId: integer("plant_id").notNull(),
  title: text("title").notNull(),
  content: text("content"),
  imageUrl: text("image_url"),
  datePosted: timestamp("date_posted").defaultNow().notNull(),
  likes: integer("likes").default(0),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  plants: many(plants),
  careActions: many(careActions),
  communityShares: many(communityShares),
}));

export const plantsRelations = relations(plants, ({ one, many }) => ({
  user: one(users, {
    fields: [plants.userId],
    references: [users.id],
  }),
  careActions: many(careActions),
  communityShares: many(communityShares),
}));

export const careActionsRelations = relations(careActions, ({ one }) => ({
  user: one(users, {
    fields: [careActions.userId],
    references: [users.id],
  }),
  plant: one(plants, {
    fields: [careActions.plantId],
    references: [plants.id],
  }),
}));

export const communitySharesRelations = relations(communityShares, ({ one }) => ({
  user: one(users, {
    fields: [communityShares.userId],
    references: [users.id],
  }),
  plant: one(plants, {
    fields: [communityShares.plantId],
    references: [plants.id],
  }),
}));

// Create schemas for inserting
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPlantSchema = createInsertSchema(plants).omit({ id: true });
export const insertCareActionSchema = createInsertSchema(careActions).omit({ id: true });
export const insertCommunityShareSchema = createInsertSchema(communityShares).omit({ id: true });

// Define types for CRUD operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertPlant = z.infer<typeof insertPlantSchema>;
export type Plant = typeof plants.$inferSelect;

export type InsertCareAction = z.infer<typeof insertCareActionSchema>;
export type CareAction = typeof careActions.$inferSelect;

export type InsertCommunityShare = z.infer<typeof insertCommunityShareSchema>;
export type CommunityShare = typeof communityShares.$inferSelect;

// Authentication schema
export const loginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});

export type LoginUser = z.infer<typeof loginSchema>;

// Register schema
export const registerSchema = insertUserSchema.extend({
  passwordConfirm: z.string().min(6),
}).refine((data) => data.password === data.passwordConfirm, {
  message: "Passwords do not match",
  path: ["passwordConfirm"],
});

export type RegisterUser = z.infer<typeof registerSchema>;

// Plant identification schema
export const plantIdentificationSchema = z.object({
  image: z.string(), // base64 encoded image
});

export type PlantIdentification = z.infer<typeof plantIdentificationSchema>;
