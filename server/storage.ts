import {
  type User,
  type InsertUser,
  type Plant,
  type InsertPlant,
  type CareAction,
  type InsertCareAction,
  type CommunityShare,
  type InsertCommunityShare,
  users,
  plants,
  careActions,
  communityShares
} from "@shared/schema";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User | undefined>;
  updateUserStripeInfo(id: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  
  // Plant operations
  getPlants(userId: number): Promise<Plant[]>;
  getPlant(id: number): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: number, plant: Partial<Plant>): Promise<Plant | undefined>;
  deletePlant(id: number): Promise<boolean>;
  updatePlantWatered(id: number): Promise<Plant | undefined>;
  updatePlantFertilized(id: number): Promise<Plant | undefined>;
  getPublicPlants(): Promise<Plant[]>;
  
  // Care action operations
  getCareActions(userId: number): Promise<CareAction[]>;
  getCareActionsForPlant(plantId: number): Promise<CareAction[]>;
  getPendingCareActions(userId: number): Promise<CareAction[]>;
  createCareAction(careAction: InsertCareAction): Promise<CareAction>;
  updateCareAction(id: number, careAction: Partial<CareAction>): Promise<CareAction | undefined>;
  markCareActionComplete(id: number): Promise<CareAction | undefined>;
  deleteCareAction(id: number): Promise<boolean>;
  
  // Community share operations
  getCommunityShares(): Promise<CommunityShare[]>;
  getUserCommunityShares(userId: number): Promise<CommunityShare[]>;
  createCommunityShare(share: InsertCommunityShare): Promise<CommunityShare>;
  likeCommunityShare(id: number): Promise<CommunityShare | undefined>;
  deleteCommunityShare(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plants: Map<number, Plant>;
  private careActions: Map<number, CareAction>;
  private communityShares: Map<number, CommunityShare>;
  private userId: number;
  private plantId: number;
  private careActionId: number;
  private communityShareId: number;

  constructor() {
    this.users = new Map();
    this.plants = new Map();
    this.careActions = new Map();
    this.communityShares = new Map();
    this.userId = 1;
    this.plantId = 1;
    this.careActionId = 1;
    this.communityShareId = 1;
    
    // Add sample user for development purposes
    this.createUser({
      username: "demo",
      password: "password123",
      email: "demo@example.com",
      firstName: "Emma",
      lastName: "Wilson",
      subscriptionType: "free",
      identificationsRemaining: 5
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      user => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserStripeInfo(id: number, stripeInfo: { stripeCustomerId: string, stripeSubscriptionId: string }): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { 
      ...user, 
      stripeCustomerId: stripeInfo.stripeCustomerId,
      stripeSubscriptionId: stripeInfo.stripeSubscriptionId,
      subscriptionType: "premium"
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Plant operations
  async getPlants(userId: number): Promise<Plant[]> {
    return Array.from(this.plants.values()).filter(
      plant => plant.userId === userId
    );
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    return this.plants.get(id);
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const id = this.plantId++;
    const plant: Plant = { ...insertPlant, id };
    this.plants.set(id, plant);
    return plant;
  }

  async updatePlant(id: number, plantData: Partial<Plant>): Promise<Plant | undefined> {
    const plant = this.plants.get(id);
    if (!plant) return undefined;
    
    const updatedPlant = { ...plant, ...plantData };
    this.plants.set(id, updatedPlant);
    return updatedPlant;
  }

  async deletePlant(id: number): Promise<boolean> {
    return this.plants.delete(id);
  }

  async updatePlantWatered(id: number): Promise<Plant | undefined> {
    const plant = this.plants.get(id);
    if (!plant) return undefined;
    
    const now = new Date();
    const updatedPlant = { ...plant, lastWatered: now, careHealth: 100 };
    this.plants.set(id, updatedPlant);
    return updatedPlant;
  }

  async updatePlantFertilized(id: number): Promise<Plant | undefined> {
    const plant = this.plants.get(id);
    if (!plant) return undefined;
    
    const now = new Date();
    const updatedPlant = { ...plant, lastFertilized: now };
    this.plants.set(id, updatedPlant);
    return updatedPlant;
  }

  async getPublicPlants(): Promise<Plant[]> {
    return Array.from(this.plants.values()).filter(
      plant => plant.isPublic
    );
  }

  // Care action operations
  async getCareActions(userId: number): Promise<CareAction[]> {
    return Array.from(this.careActions.values()).filter(
      action => action.userId === userId
    );
  }

  async getCareActionsForPlant(plantId: number): Promise<CareAction[]> {
    return Array.from(this.careActions.values()).filter(
      action => action.plantId === plantId
    );
  }

  async getPendingCareActions(userId: number): Promise<CareAction[]> {
    return Array.from(this.careActions.values()).filter(
      action => action.userId === userId && !action.isCompleted
    );
  }

  async createCareAction(insertCareAction: InsertCareAction): Promise<CareAction> {
    const id = this.careActionId++;
    const careAction: CareAction = { ...insertCareAction, id };
    this.careActions.set(id, careAction);
    return careAction;
  }

  async updateCareAction(id: number, careActionData: Partial<CareAction>): Promise<CareAction | undefined> {
    const careAction = this.careActions.get(id);
    if (!careAction) return undefined;
    
    const updatedCareAction = { ...careAction, ...careActionData };
    this.careActions.set(id, updatedCareAction);
    return updatedCareAction;
  }

  async markCareActionComplete(id: number): Promise<CareAction | undefined> {
    const careAction = this.careActions.get(id);
    if (!careAction) return undefined;
    
    const now = new Date();
    const updatedCareAction = { 
      ...careAction, 
      isCompleted: true,
      completedAt: now
    };
    this.careActions.set(id, updatedCareAction);
    
    // If this is a watering or fertilizing action, update the plant record
    const plant = this.plants.get(careAction.plantId);
    if (plant) {
      if (careAction.actionType === 'water') {
        await this.updatePlantWatered(plant.id);
      } else if (careAction.actionType === 'fertilize') {
        await this.updatePlantFertilized(plant.id);
      }
    }
    
    return updatedCareAction;
  }

  async deleteCareAction(id: number): Promise<boolean> {
    return this.careActions.delete(id);
  }

  // Community share operations
  async getCommunityShares(): Promise<CommunityShare[]> {
    return Array.from(this.communityShares.values());
  }

  async getUserCommunityShares(userId: number): Promise<CommunityShare[]> {
    return Array.from(this.communityShares.values()).filter(
      share => share.userId === userId
    );
  }

  async createCommunityShare(insertShare: InsertCommunityShare): Promise<CommunityShare> {
    const id = this.communityShareId++;
    const share: CommunityShare = { ...insertShare, id };
    this.communityShares.set(id, share);
    return share;
  }

  async likeCommunityShare(id: number): Promise<CommunityShare | undefined> {
    const share = this.communityShares.get(id);
    if (!share) return undefined;
    
    const updatedShare = { ...share, likes: (share.likes || 0) + 1 };
    this.communityShares.set(id, updatedShare);
    return updatedShare;
  }

  async deleteCommunityShare(id: number): Promise<boolean> {
    return this.communityShares.delete(id);
  }
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }

  async updateUserStripeInfo(
    id: number, 
    stripeInfo: { stripeCustomerId: string; stripeSubscriptionId: string }
  ): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        stripeCustomerId: stripeInfo.stripeCustomerId,
        stripeSubscriptionId: stripeInfo.stripeSubscriptionId,
        subscriptionType: "premium"
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser || undefined;
  }
  
  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Plant operations
  async getPlants(userId: number): Promise<Plant[]> {
    return db.select().from(plants).where(eq(plants.userId, userId));
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    const [plant] = await db.select().from(plants).where(eq(plants.id, id));
    return plant || undefined;
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const [plant] = await db.insert(plants).values(insertPlant).returning();
    return plant;
  }

  async updatePlant(id: number, plantData: Partial<Plant>): Promise<Plant | undefined> {
    const [updatedPlant] = await db
      .update(plants)
      .set(plantData)
      .where(eq(plants.id, id))
      .returning();
    return updatedPlant || undefined;
  }

  async deletePlant(id: number): Promise<boolean> {
    await db.delete(plants).where(eq(plants.id, id));
    return true;
  }

  async updatePlantWatered(id: number): Promise<Plant | undefined> {
    const now = new Date();
    const [updatedPlant] = await db
      .update(plants)
      .set({
        lastWatered: now,
        careHealth: 100
      })
      .where(eq(plants.id, id))
      .returning();
    return updatedPlant || undefined;
  }

  async updatePlantFertilized(id: number): Promise<Plant | undefined> {
    const now = new Date();
    const [updatedPlant] = await db
      .update(plants)
      .set({
        lastFertilized: now
      })
      .where(eq(plants.id, id))
      .returning();
    return updatedPlant || undefined;
  }

  async getPublicPlants(): Promise<Plant[]> {
    return db.select().from(plants).where(eq(plants.isPublic, true));
  }

  // Care action operations
  async getCareActions(userId: number): Promise<CareAction[]> {
    return db.select().from(careActions).where(eq(careActions.userId, userId));
  }

  async getCareActionsForPlant(plantId: number): Promise<CareAction[]> {
    return db.select().from(careActions).where(eq(careActions.plantId, plantId));
  }

  async getPendingCareActions(userId: number): Promise<CareAction[]> {
    return db
      .select()
      .from(careActions)
      .where(and(eq(careActions.userId, userId), eq(careActions.isCompleted, false)));
  }

  async createCareAction(insertCareAction: InsertCareAction): Promise<CareAction> {
    const [careAction] = await db.insert(careActions).values(insertCareAction).returning();
    return careAction;
  }

  async updateCareAction(id: number, careActionData: Partial<CareAction>): Promise<CareAction | undefined> {
    const [updatedCareAction] = await db
      .update(careActions)
      .set(careActionData)
      .where(eq(careActions.id, id))
      .returning();
    return updatedCareAction || undefined;
  }

  async markCareActionComplete(id: number): Promise<CareAction | undefined> {
    const now = new Date();
    const [updatedCareAction] = await db
      .update(careActions)
      .set({
        isCompleted: true,
        completedAt: now
      })
      .where(eq(careActions.id, id))
      .returning();
    
    if (updatedCareAction) {
      // If this is a watering or fertilizing action, update the plant
      if (updatedCareAction.actionType === 'water') {
        await this.updatePlantWatered(updatedCareAction.plantId);
      } else if (updatedCareAction.actionType === 'fertilize') {
        await this.updatePlantFertilized(updatedCareAction.plantId);
      }
    }
    
    return updatedCareAction || undefined;
  }

  async deleteCareAction(id: number): Promise<boolean> {
    await db.delete(careActions).where(eq(careActions.id, id));
    return true;
  }

  // Community share operations
  async getCommunityShares(): Promise<CommunityShare[]> {
    return db.select().from(communityShares);
  }

  async getUserCommunityShares(userId: number): Promise<CommunityShare[]> {
    return db.select().from(communityShares).where(eq(communityShares.userId, userId));
  }

  async createCommunityShare(insertShare: InsertCommunityShare): Promise<CommunityShare> {
    const [share] = await db.insert(communityShares).values(insertShare).returning();
    return share;
  }

  async likeCommunityShare(id: number): Promise<CommunityShare | undefined> {
    // Use SQL increment operator to safely increment the likes counter
    const [updatedShare] = await db
      .update(communityShares)
      .set({
        likes: sql`${communityShares.likes} + 1`
      })
      .where(eq(communityShares.id, id))
      .returning();
    return updatedShare || undefined;
  }

  async deleteCommunityShare(id: number): Promise<boolean> {
    await db.delete(communityShares).where(eq(communityShares.id, id));
    return true;
  }
}

// Use database storage if DATABASE_URL is provided, otherwise fallback to memory storage
export const storage = process.env.DATABASE_URL 
  ? new DatabaseStorage() 
  : new MemStorage();
