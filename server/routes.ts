import express, { type Express, type Request, type Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { 
  loginSchema, 
  registerSchema, 
  insertPlantSchema, 
  insertCareActionSchema, 
  insertCommunityShareSchema,
  plantIdentificationSchema,
  users
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import multer from "multer";
import axios from "axios";
import Stripe from "stripe";
import { randomUUID } from "crypto";
import { 
  sendTrialStartedEmail, 
  sendTrialEndingEmail, 
  sendSubscriptionConfirmationEmail, 
  sendProPackDownloadEmail 
} from "./email-service";

// Configure Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    })
  : undefined;

// Configure multer for file uploads
const storage2 = multer.memoryStorage();
const upload = multer({ 
  storage: storage2,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.session && req.session.userId) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };
  
  // Admin middleware
  const isAdmin = (req: any, res: Response, next: Function) => {
    // Admin is determined by username or email containing 'admin'
    if (req.user && (
      req.user.username.toLowerCase().includes('admin') ||
      (req.user.email && req.user.email.toLowerCase().includes('admin'))
    )) {
      return next();
    }
    return res.status(403).json({ message: "Admin access required" });
  };

  // Setup sessions
  const expressSession = await import("express-session");
  const MemoryStore = (await import("memorystore")).default(expressSession.default);

  app.use(
    expressSession.default({
      secret: process.env.SESSION_SECRET || "plant-app-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, maxAge: 86400000 }, // 1 day
      store: new MemoryStore({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Set current user on the request for convenience
  app.use(async (req: any, res, next) => {
    if (req.session && req.session.userId) {
      try {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          req.user = user;
          delete req.user.password; // Don't send password to the client
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    }
    next();
  });

  // API Routes
  app.get("/api/me", isAuthenticated, (req: any, res) => {
    res.json(req.user);
  });

  // Auth routes
  app.post("/api/register", async (req, res) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(validatedData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Remove passwordConfirm from data to be saved
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordConfirm, ...userData } = validatedData;
      
      const newUser = await storage.createUser(userData);
      
      // Log in the user automatically
      (req.session as any).userId = newUser.id;
      
      // Send back user without password
      const { password, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Register error:", error);
      res.status(500).json({ message: "Server error during registration" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(validatedData.username);
      if (!user || user.password !== validatedData.password) { // In real app, use proper password hashing
        return res.status(401).json({ message: "Invalid username or password" });
      }
      
      // Set user session
      (req.session as any).userId = user.id;
      
      // Send back user without password
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error during login" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Error during logout" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Plant routes
  app.get("/api/plants", isAuthenticated, async (req: any, res) => {
    try {
      const plants = await storage.getPlants(req.user.id);
      res.json(plants);
    } catch (error) {
      console.error("Get plants error:", error);
      res.status(500).json({ message: "Error fetching plants" });
    }
  });

  app.get("/api/plants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const plant = await storage.getPlant(parseInt(req.params.id));
      
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      
      if (plant.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this plant" });
      }
      
      res.json(plant);
    } catch (error) {
      console.error("Get plant error:", error);
      res.status(500).json({ message: "Error fetching plant" });
    }
  });

  app.post("/api/plants", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertPlantSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      const newPlant = await storage.createPlant(validatedData);
      
      // Create initial care actions based on water frequency
      if (validatedData.waterFrequency) {
        const waterDueDate = new Date();
        waterDueDate.setDate(waterDueDate.getDate() + validatedData.waterFrequency);
        
        await storage.createCareAction({
          plantId: newPlant.id,
          userId: req.user.id,
          actionType: 'water',
          dueDate: waterDueDate,
          isCompleted: false
        });
      }
      
      // Create initial care actions based on fertilize frequency
      if (validatedData.fertilizeFrequency) {
        const fertilizeDueDate = new Date();
        fertilizeDueDate.setDate(fertilizeDueDate.getDate() + validatedData.fertilizeFrequency);
        
        await storage.createCareAction({
          plantId: newPlant.id,
          userId: req.user.id,
          actionType: 'fertilize',
          dueDate: fertilizeDueDate,
          isCompleted: false
        });
      }
      
      res.status(201).json(newPlant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Create plant error:", error);
      res.status(500).json({ message: "Error creating plant" });
    }
  });

  app.put("/api/plants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const plantId = parseInt(req.params.id);
      const plant = await storage.getPlant(plantId);
      
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      
      if (plant.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this plant" });
      }
      
      const validatedData = z.object({
        name: z.string().optional(),
        scientificName: z.string().optional(),
        imageUrl: z.string().optional(),
        waterFrequency: z.number().optional(),
        fertilizeFrequency: z.number().optional(),
        lightNeeds: z.string().optional(),
        notes: z.string().optional(),
        isPublic: z.boolean().optional()
      }).parse(req.body);
      
      const updatedPlant = await storage.updatePlant(plantId, validatedData);
      
      res.json(updatedPlant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Update plant error:", error);
      res.status(500).json({ message: "Error updating plant" });
    }
  });

  app.delete("/api/plants/:id", isAuthenticated, async (req: any, res) => {
    try {
      const plantId = parseInt(req.params.id);
      const plant = await storage.getPlant(plantId);
      
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      
      if (plant.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this plant" });
      }
      
      // Delete associated care actions first
      const careActions = await storage.getCareActionsForPlant(plantId);
      for (const action of careActions) {
        await storage.deleteCareAction(action.id);
      }
      
      const success = await storage.deletePlant(plantId);
      
      if (success) {
        res.json({ message: "Plant deleted successfully" });
      } else {
        res.status(500).json({ message: "Error deleting plant" });
      }
    } catch (error) {
      console.error("Delete plant error:", error);
      res.status(500).json({ message: "Error deleting plant" });
    }
  });

  app.post("/api/plants/:id/water", isAuthenticated, async (req: any, res) => {
    try {
      const plantId = parseInt(req.params.id);
      const plant = await storage.getPlant(plantId);
      
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      
      if (plant.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to water this plant" });
      }
      
      const updatedPlant = await storage.updatePlantWatered(plantId);
      
      // Find and complete any pending watering care actions
      const careActions = await storage.getCareActionsForPlant(plantId);
      const waterActions = careActions.filter(a => a.actionType === 'water' && !a.isCompleted);
      
      for (const action of waterActions) {
        await storage.markCareActionComplete(action.id);
      }
      
      // Create next watering action
      if (plant.waterFrequency) {
        const waterDueDate = new Date();
        waterDueDate.setDate(waterDueDate.getDate() + plant.waterFrequency);
        
        await storage.createCareAction({
          plantId: plant.id,
          userId: req.user.id,
          actionType: 'water',
          dueDate: waterDueDate,
          isCompleted: false
        });
      }
      
      res.json(updatedPlant);
    } catch (error) {
      console.error("Water plant error:", error);
      res.status(500).json({ message: "Error watering plant" });
    }
  });

  app.post("/api/plants/:id/fertilize", isAuthenticated, async (req: any, res) => {
    try {
      const plantId = parseInt(req.params.id);
      const plant = await storage.getPlant(plantId);
      
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }
      
      if (plant.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to fertilize this plant" });
      }
      
      const updatedPlant = await storage.updatePlantFertilized(plantId);
      
      // Find and complete any pending fertilizing care actions
      const careActions = await storage.getCareActionsForPlant(plantId);
      const fertilizeActions = careActions.filter(a => a.actionType === 'fertilize' && !a.isCompleted);
      
      for (const action of fertilizeActions) {
        await storage.markCareActionComplete(action.id);
      }
      
      // Create next fertilizing action
      if (plant.fertilizeFrequency) {
        const fertilizeDueDate = new Date();
        fertilizeDueDate.setDate(fertilizeDueDate.getDate() + plant.fertilizeFrequency);
        
        await storage.createCareAction({
          plantId: plant.id,
          userId: req.user.id,
          actionType: 'fertilize',
          dueDate: fertilizeDueDate,
          isCompleted: false
        });
      }
      
      res.json(updatedPlant);
    } catch (error) {
      console.error("Fertilize plant error:", error);
      res.status(500).json({ message: "Error fertilizing plant" });
    }
  });

  // Care Actions routes
  app.get("/api/care-actions", isAuthenticated, async (req: any, res) => {
    try {
      const careActions = await storage.getCareActions(req.user.id);
      res.json(careActions);
    } catch (error) {
      console.error("Get care actions error:", error);
      res.status(500).json({ message: "Error fetching care actions" });
    }
  });

  app.get("/api/care-actions/pending", isAuthenticated, async (req: any, res) => {
    try {
      const pendingActions = await storage.getPendingCareActions(req.user.id);
      
      // Get plant details for each action
      const actionsWithPlants = await Promise.all(pendingActions.map(async (action) => {
        const plant = await storage.getPlant(action.plantId);
        return { ...action, plant };
      }));
      
      // Sort by due date
      actionsWithPlants.sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      
      res.json(actionsWithPlants);
    } catch (error) {
      console.error("Get pending care actions error:", error);
      res.status(500).json({ message: "Error fetching pending care actions" });
    }
  });

  app.post("/api/care-actions", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCareActionSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      // Verify the plant belongs to the user
      const plant = await storage.getPlant(validatedData.plantId);
      if (!plant || plant.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to create care action for this plant" });
      }
      
      const newCareAction = await storage.createCareAction(validatedData);
      res.status(201).json(newCareAction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Create care action error:", error);
      res.status(500).json({ message: "Error creating care action" });
    }
  });

  app.post("/api/care-actions/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const actionId = parseInt(req.params.id);
      const action = await storage.updateCareAction(actionId, { 
        isCompleted: true, 
        completedAt: new Date() 
      });
      
      if (!action) {
        return res.status(404).json({ message: "Care action not found" });
      }
      
      // If this is a watering or fertilizing action, mark the plant as watered/fertilized
      if (action.actionType === 'water') {
        await storage.updatePlantWatered(action.plantId);
        
        // Create next watering action
        const plant = await storage.getPlant(action.plantId);
        if (plant && plant.waterFrequency) {
          const waterDueDate = new Date();
          waterDueDate.setDate(waterDueDate.getDate() + plant.waterFrequency);
          
          await storage.createCareAction({
            plantId: plant.id,
            userId: req.user.id,
            actionType: 'water',
            dueDate: waterDueDate,
            isCompleted: false
          });
        }
      } 
      else if (action.actionType === 'fertilize') {
        await storage.updatePlantFertilized(action.plantId);
        
        // Create next fertilizing action
        const plant = await storage.getPlant(action.plantId);
        if (plant && plant.fertilizeFrequency) {
          const fertilizeDueDate = new Date();
          fertilizeDueDate.setDate(fertilizeDueDate.getDate() + plant.fertilizeFrequency);
          
          await storage.createCareAction({
            plantId: plant.id,
            userId: req.user.id,
            actionType: 'fertilize',
            dueDate: fertilizeDueDate,
            isCompleted: false
          });
        }
      }
      
      res.json(action);
    } catch (error) {
      console.error("Complete care action error:", error);
      res.status(500).json({ message: "Error completing care action" });
    }
  });

  // Community routes
  app.get("/api/community", async (req, res) => {
    try {
      const shares = await storage.getCommunityShares();
      res.json(shares);
    } catch (error) {
      console.error("Get community shares error:", error);
      res.status(500).json({ message: "Error fetching community shares" });
    }
  });

  app.post("/api/community", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertCommunityShareSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      // Verify the plant belongs to the user
      const plant = await storage.getPlant(validatedData.plantId);
      if (!plant || plant.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to share this plant" });
      }
      
      const newShare = await storage.createCommunityShare(validatedData);
      res.status(201).json(newShare);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      
      console.error("Create community share error:", error);
      res.status(500).json({ message: "Error creating community share" });
    }
  });

  app.post("/api/community/:id/like", isAuthenticated, async (req, res) => {
    try {
      const shareId = parseInt(req.params.id);
      const updatedShare = await storage.likeCommunityShare(shareId);
      
      if (!updatedShare) {
        return res.status(404).json({ message: "Community share not found" });
      }
      
      res.json(updatedShare);
    } catch (error) {
      console.error("Like community share error:", error);
      res.status(500).json({ message: "Error liking community share" });
    }
  });

  // Plant identification with Plant.id API
  app.post("/api/identify", upload.single('image'), isAuthenticated, async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image provided" });
      }
      
      // Check if user has identifications remaining
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.subscriptionType === 'free' && user.identificationsRemaining <= 0) {
        return res.status(403).json({ 
          message: "No plant identifications remaining. Upgrade to premium for unlimited identifications.",
          upgrade: true 
        });
      }
      
      // Check if Plant.id API key is available
      const PLANT_ID_API_KEY = process.env.PLANT_ID_API_KEY || process.env.VITE_PLANT_ID_API_KEY;
      if (!PLANT_ID_API_KEY) {
        return res.status(500).json({ message: "Plant.id API key not configured" });
      }
      
      // Convert image to base64
      const imageBase64 = req.file.buffer.toString('base64');
      
      // Call Plant.id API
      const plantIdResponse = await axios.post('https://api.plant.id/v2/identify', {
        images: [imageBase64],
        modifiers: ["crops_fast", "similar_images"],
        plant_language: "en",
        plant_details: ["common_names", "url", "wiki_description", "taxonomy", "synonyms", "watering", "propagation"]
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': PLANT_ID_API_KEY
        }
      });
      
      // Decrement identifications if free user
      if (user.subscriptionType === 'free') {
        await storage.updateUser(user.id, {
          identificationsRemaining: user.identificationsRemaining - 1
        });
      }
      
      res.json(plantIdResponse.data);
    } catch (error) {
      console.error("Plant identification error:", error);
      res.status(500).json({ message: "Error identifying plant" });
    }
  });

  // Stripe subscription routes
  // Pro pack download endpoint
  app.get("/api/download-pro-pack", isAuthenticated, async (req: any, res) => {
    try {
      // For testing purposes: Check if user is admin - then bypass subscription check
      const userIsAdmin = req.user && (
        req.user.username === 'admin' || 
        (req.user.email && req.user.email.includes('admin'))
      );
      
      // Check if user has lifetime access or is admin
      if (!userIsAdmin && req.user.subscriptionType !== "premium-lifetime") {
        return res.status(403).json({ message: "Only lifetime premium users can download the Pro Pack" });
      }
      
      // Generate download URL with a temporary token (for a real application)
      // In a production app, this would be a signed URL with expiration
      const downloadUrl = "/pro-pack/snaptheplant-pro.zip";
      
      // In a real application, we would prepare a download file
      // For now, we'll just simulate this with a JSON response
      const responseData = {
        downloadUrl,
        fileName: "SnapThePlant-ProPack.zip",
        fileSize: "15.2 MB",
        instructions: "Download and extract this ZIP file to access offline plant identification features."
      };
      
      // Send email with download link if user has an email
      // Skip for admin users testing the download functionality
      if (!userIsAdmin && req.user.email) {
        const fullDownloadUrl = `https://snaptheplant.com${downloadUrl}`;
        sendProPackDownloadEmail(req.user.email, fullDownloadUrl)
          .then(success => {
            if (!success) {
              console.warn(`Failed to send Pro Pack download email to ${req.user.email}`);
            }
          })
          .catch(err => {
            console.error(`Error sending Pro Pack download email: ${err}`);
          });
      }
      
      res.json(responseData);
    } catch (error) {
      console.error("Download Pro Pack error:", error);
      res.status(500).json({ message: "Error preparing download" });
    }
  });
  
  // Beta tester feedback endpoint
  app.post("/api/beta-feedback", isAuthenticated, async (req: any, res) => {
    try {
      const { type, feedback, email } = req.body;
      const user = req.user;
      
      // Validate required fields
      if (!feedback || !type) {
        return res.status(400).json({ message: "Feedback text and type are required" });
      }
      
      // In a production environment, we would store this in a database
      // For now, we'll write it to a log file
      const feedbackEntry = {
        userId: user.id,
        username: user.username,
        email: email || user.email,
        type,
        feedback,
        timestamp: new Date().toISOString(),
      };
      
      // Log to file system
      const logDir = path.resolve('./analytics_logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      const logFile = path.resolve(logDir, `beta_feedback_${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(feedbackEntry) + '\n');
      
      // Email notification (if this was a real system)
      if (process.env.SENDGRID_API_KEY && user.email) {
        // We could send a confirmation email to the user
        console.log(`Feedback received from ${user.email}: ${type}`);
      }
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Beta feedback error:", error);
      res.status(500).json({ message: "Error submitting feedback" });
    }
  });
  
  // Update beta tester status for a user
  app.post("/api/admin/toggle-beta-tester", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId, isBetaTester } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const updatedUser = await storage.updateUser(userId, { 
        isBetaTester: !!isBetaTester
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password before sending response
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Toggle beta tester error:", error);
      res.status(500).json({ message: "Error updating beta tester status" });
    }
  });

  // Setup for payment endpoints

  if (stripe) {
    // One-time payment endpoint
    app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
      try {
        const user = req.user;
        
        // If user already has a premium subscription, no need to charge again
        if (user.subscriptionType === "premium") {
          return res.status(400).json({ message: "User already has premium access" });
        }
        
        // Fixed price for one-time purchase (in cents)
        const amount = 4999; // $49.99
        
        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: "usd",
          metadata: {
            userId: user.id.toString(),
            type: "one-time"
          }
        });
        
        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error: any) {
        console.error("Create payment intent error:", error);
        res.status(500).json({ message: "Error creating payment: " + error.message });
      }
    });
    
    // Handle successful one-time payment
    app.post("/api/payment-success", isAuthenticated, async (req: any, res) => {
      try {
        const { paymentIntentId } = req.body;
        
        if (!paymentIntentId) {
          return res.status(400).json({ message: "Payment intent ID is required" });
        }
        
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        
        if (paymentIntent.status === "succeeded") {
          // Update user to premium with one-time purchase
          await storage.updateUser(req.user.id, { 
            subscriptionType: "premium-lifetime",
            identificationsRemaining: 999999 // Essentially unlimited
          });
          
          // Send subscription confirmation email if user has email
          if (req.user.email) {
            // This is a lifetime purchase, not a monthly subscription
            sendSubscriptionConfirmationEmail(req.user.email, false)
              .then(success => {
                if (!success) {
                  console.warn(`Failed to send subscription confirmation email to ${req.user.email}`);
                }
              })
              .catch(err => {
                console.error(`Error sending subscription confirmation email: ${err}`);
              });
          }
          
          // Create a download link (simulated)
          res.json({ 
            success: true, 
            downloadAvailable: true 
          });
        } else {
          res.status(400).json({ message: "Payment has not been completed" });
        }
      } catch (error: any) {
        console.error("Payment success error:", error);
        res.status(500).json({ message: "Error processing payment: " + error.message });
      }
    });
    
    // Subscription endpoint
    app.post("/api/create-subscription", isAuthenticated, async (req: any, res) => {
      try {
        const user = req.user;
        
        if (user.stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          
          res.send({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
          });
          
          return;
        }
        
        if (!user.email) {
          throw new Error('No user email on file');
        }
        
        try {
          const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID;
          if (!STRIPE_PRICE_ID) {
            return res.status(500).json({ message: "Stripe price ID not configured" });
          }
          
          const customer = await stripe.customers.create({
            email: user.email,
            name: user.username,
          });
          
          const subscription = await stripe.subscriptions.create({
            customer: customer.id,
            items: [{
              price: STRIPE_PRICE_ID,
            }],
            payment_behavior: 'default_incomplete',
            expand: ['latest_invoice.payment_intent'],
          });
          
          await storage.updateUserStripeInfo(user.id, {
            stripeCustomerId: customer.id,
            stripeSubscriptionId: subscription.id
          });
          
          res.send({
            subscriptionId: subscription.id,
            clientSecret: subscription.latest_invoice?.payment_intent?.client_secret,
          });
        } catch (error: any) {
          return res.status(400).send({ error: { message: error.message } });
        }
      } catch (error) {
        console.error("Create subscription error:", error);
        res.status(500).json({ message: "Error creating subscription" });
      }
    });
    
    // Handle subscription status updates via webhook
    app.post("/api/webhook", express.raw({type: 'application/json'}), async (req, res) => {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        console.warn("No STRIPE_WEBHOOK_SECRET set, skipping signature verification");
        return res.status(200).send();
      }
      
      let event;
      try {
        const payload = req.body;
        const sig = req.headers['stripe-signature'];
        
        if (!sig) {
          return res.status(400).send('Webhook Error: No Stripe signature found');
        }
        
        event = stripe.webhooks.constructEvent(
          payload,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
      
      // Handle the event
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          const subscription = event.data.object;
          try {
            // Get the customer ID from the subscription
            const customerId = subscription.customer;
            
            // Find user with this Stripe customer ID
            const user = await db.select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId.toString()))
              .limit(1);
            
            if (!user || user.length === 0) {
              console.error(`No user found for customer ID: ${customerId}`);
              break;
            }
            
            // Check subscription status
            if (subscription.status === 'active') {
              // Update user to premium status
              await storage.updateUser(user[0].id, { 
                subscriptionType: "premium",
                identificationsRemaining: 999999 // Essentially unlimited
              });
              
              // Send email confirmation for monthly subscription
              if (user[0].email) {
                sendSubscriptionConfirmationEmail(user[0].email, true) // true for monthly
                  .then(success => {
                    if (!success) {
                      console.warn(`Failed to send subscription confirmation email to ${user[0].email}`);
                    }
                  })
                  .catch(err => {
                    console.error(`Error sending subscription confirmation email: ${err}`);
                  });
              }
            }
          } catch (error) {
            console.error('Error handling subscription webhook:', error);
          }
          break;
          
        case 'customer.subscription.deleted':
          // Handle subscription cancellation
          const canceledSubscription = event.data.object;
          try {
            const customerId = canceledSubscription.customer;
            
            // Find user with this Stripe customer ID
            const user = await db.select()
              .from(users)
              .where(eq(users.stripeCustomerId, customerId.toString()))
              .limit(1);
            
            if (!user || user.length === 0) {
              console.error(`No user found for customer ID: ${customerId}`);
              break;
            }
            
            // Downgrade user to free tier
            await storage.updateUser(user[0].id, { 
              subscriptionType: "free",
              identificationsRemaining: 3 // Give them a few free identifications
            });
          } catch (error) {
            console.error('Error handling subscription cancellation:', error);
          }
          break;
          
        default:
          // Unexpected event type
          console.log(`Unhandled event type: ${event.type}`);
      }
      
      // Return a 200 response to acknowledge receipt of the event
      res.send({ received: true });
    });
  }

  // Free trial functionality
  app.post("/api/start-free-trial", isAuthenticated, async (req: any, res) => {
    try {
      const user = req.user;
      
      // Only allow starting trial if user is on free plan
      if (user.subscriptionType !== 'free' && user.subscriptionType !== null) {
        return res.status(400).json({ 
          message: "You already have an active subscription or trial" 
        });
      }
      
      // Set trial end date to 3 days from now
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 3);
      
      // Update user to trial status
      const updatedUser = await storage.updateUser(user.id, {
        subscriptionType: 'trial',
        trialEndDate
      });
      
      if (!updatedUser) {
        throw new Error("Failed to update user");
      }
      
      // Log analytics event
      const analyticsEntry = {
        userId: user.id,
        username: user.username,
        event: 'started_trial',
        timestamp: new Date().toISOString(),
      };
      
      // Log to analytics logs
      if (fs.existsSync(analyticsLogDir)) {
        const logFile = path.resolve(analyticsLogDir, `analytics_${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, JSON.stringify(analyticsEntry) + '\n');
      }
      
      // Send trial started email if user has an email
      if (user.email) {
        sendTrialStartedEmail(user.email, trialEndDate)
          .then(success => {
            if (!success) {
              console.warn(`Failed to send trial started email to ${user.email}`);
            }
          })
          .catch(err => {
            console.error(`Error sending trial started email: ${err}`);
          });
      }
      
      res.json({ 
        success: true, 
        message: "Free trial started successfully",
        trialEndDate
      });
    } catch (error) {
      console.error("Error starting free trial:", error);
      res.status(500).json({ message: "Server error starting free trial" });
    }
  });

  // Analytics tracking
  const analyticsLogDir = path.resolve('analytics_logs');
  if (!fs.existsSync(analyticsLogDir)) {
    fs.mkdirSync(analyticsLogDir, { recursive: true });
  }
  
  // Setup a daily check for trial ending notifications
  // In a production app, this would be a scheduled cron job
  // For demo purposes, we'll set up a timer to check every hour
  setInterval(async () => {
    try {
      console.log("Running scheduled check for trials ending soon...");
      
      // Get all users on trial
      const trialUsers = await db.select()
        .from(users)
        .where(eq(users.subscriptionType, 'trial'));
      
      const now = new Date();
      
      for (const user of trialUsers) {
        // Skip users without email or trial end date
        if (!user.email || !user.trialEndDate) continue;
        
        const trialEndDate = new Date(user.trialEndDate);
        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Send reminder for trials ending in 1 or 2 days
        if (daysRemaining === 1 || daysRemaining === 2) {
          console.log(`Sending trial ending reminder to ${user.email} (${daysRemaining} days remaining)`);
          
          sendTrialEndingEmail(user.email, daysRemaining)
            .then(success => {
              if (!success) {
                console.warn(`Failed to send trial ending email to ${user.email}`);
              }
            })
            .catch(err => {
              console.error(`Error sending trial ending email: ${err}`);
            });
        }
        
        // When trial has ended, update user status
        if (daysRemaining <= 0) {
          console.log(`Trial ended for user ${user.username}, updating status`);
          
          await storage.updateUser(user.id, {
            subscriptionType: 'free',
            identificationsRemaining: 3 // Give them some free identifications after trial
          });
        }
      }
    } catch (error) {
      console.error("Error in trial ending check:", error);
    }
  }, 60 * 60 * 1000); // Check once per hour

  app.post("/api/analytics/track", isAuthenticated, async (req: any, res) => {
    try {
      const { event, properties, timestamp } = req.body;
      
      if (!event) {
        return res.status(400).json({ message: "Event name is required" });
      }
      
      // Create analytics entry with user info
      const analyticsEntry = {
        userId: req.user.id,
        username: req.user.username,
        event,
        properties: properties || {},
        timestamp: timestamp || new Date().toISOString(),
      };
      
      // Log to file system
      const logFile = path.resolve(analyticsLogDir, `analytics_${new Date().toISOString().split('T')[0]}.log`);
      fs.appendFileSync(logFile, JSON.stringify(analyticsEntry) + '\n');
      
      // Store in database for a real application
      // await db.insert(analyticsTable).values(analyticsEntry);
      
      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Analytics error:", error);
      // Don't fail the user request if analytics fails
      res.status(200).json({ success: true });
    }
  });
  
  // Admin Routes - Only available in development
  // These routes allow developers to test features without real payments
  
  // Get all users (admin only)
  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const allUsers = await db.select().from(users);
      
      // Remove passwords before sending to client
      const safeUsers = allUsers.map(user => {
        const { password, ...safeUser } = user;
        return safeUser;
      });
      
      res.json(safeUsers);
    } catch (error) {
      console.error("Admin get users error:", error);
      res.status(500).json({ message: "Error fetching users" });
    }
  });
  
  // Update user subscription status (admin only)
  app.post("/api/admin/update-user-status", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId, subscriptionType } = req.body;
      
      if (!userId || !subscriptionType) {
        return res.status(400).json({ message: "User ID and subscription type are required" });
      }
      
      // Set unlimited identifications for premium accounts
      const identificationsRemaining = 
        subscriptionType === 'premium' || subscriptionType === 'premium-lifetime'
          ? 999999 
          : subscriptionType === 'free' 
            ? 3 
            : 10; // For trials
      
      const updatedUser = await storage.updateUser(userId, { 
        subscriptionType,
        identificationsRemaining
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Remove password before sending response
      const { password, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("Admin update user error:", error);
      res.status(500).json({ message: "Error updating user" });
    }
  });
  
  // Start trial with custom duration (admin only)
  app.post("/api/admin/start-trial", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { userId, days = 3 } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Calculate trial end date based on specified days
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + days);
      
      // Update user to trial status
      const updatedUser = await storage.updateUser(userId, {
        subscriptionType: 'trial',
        trialEndDate,
        identificationsRemaining: 10 // Give some free identifications for the trial
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Send trial started email if user has email
      const user = await storage.getUser(userId);
      if (user && user.email) {
        sendTrialStartedEmail(user.email, trialEndDate)
          .then(success => {
            if (!success) {
              console.warn(`Failed to send trial started email to ${user.email}`);
            }
          })
          .catch(err => {
            console.error(`Error sending trial started email: ${err}`);
          });
      }
      
      // Remove password before sending response
      const { password, ...safeUser } = updatedUser;
      res.json({
        ...safeUser,
        trialEndDate,
        message: "Trial started successfully"
      });
    } catch (error) {
      console.error("Admin start trial error:", error);
      res.status(500).json({ message: "Error starting trial" });
    }
  });
  
  // Send test email (admin only)
  app.post("/api/admin/send-test-email", isAuthenticated, isAdmin, async (req: any, res) => {
    try {
      const { emailType, email } = req.body;
      
      if (!emailType) {
        return res.status(400).json({ message: "Email type is required" });
      }
      
      // Use provided email or fallback to user's email
      const recipient = email || req.user.email;
      
      if (!recipient) {
        return res.status(400).json({ message: "Email address is required" });
      }
      
      let success = false;
      const now = new Date();
      
      // Send appropriate test email based on type
      switch (emailType) {
        case 'trial_started':
          const trialEnd = new Date();
          trialEnd.setDate(now.getDate() + 3);
          success = await sendTrialStartedEmail(recipient, trialEnd);
          break;
          
        case 'trial_ending_1day':
          success = await sendTrialEndingEmail(recipient, 1);
          break;
          
        case 'trial_ending_2days':
          success = await sendTrialEndingEmail(recipient, 2);
          break;
          
        case 'subscription_monthly':
          success = await sendSubscriptionConfirmationEmail(recipient, true);
          break;
          
        case 'subscription_lifetime':
          success = await sendSubscriptionConfirmationEmail(recipient, false);
          break;
          
        case 'pro_pack_download':
          const downloadUrl = "https://snaptheplant.com/pro-pack/download?token=test-token";
          success = await sendProPackDownloadEmail(recipient, downloadUrl);
          break;
          
        default:
          return res.status(400).json({ message: "Invalid email type" });
      }
      
      if (success) {
        res.json({ success: true, message: "Test email sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send test email" });
      }
    } catch (error) {
      console.error("Admin send test email error:", error);
      res.status(500).json({ message: "Error sending test email" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
