import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { usePlant } from "@/contexts/plant-context";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackEvent, AnalyticsEvent } from "@/lib/analytics";

interface AddPlantModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AddPlantModal({ isOpen, onClose }: AddPlantModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { showAddPlantModal, setShowAddPlantModal, plantToAdd } = usePlant();
  
  // Determine if modal should be shown
  const showModal = isOpen !== undefined ? isOpen : showAddPlantModal;
  const closeModal = onClose || (() => setShowAddPlantModal(false));
  
  // Form state
  const [name, setName] = useState("");
  const [scientificName, setScientificName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [waterFrequency, setWaterFrequency] = useState("7");
  const [fertilizeFrequency, setFertilizeFrequency] = useState("30");
  const [lightNeeds, setLightNeeds] = useState("medium");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with plant data if provided
  useEffect(() => {
    if (plantToAdd) {
      setName(plantToAdd.name || "");
      setScientificName(plantToAdd.scientificName || "");
      setImageUrl(plantToAdd.imageUrl || "");
      
      // Parse care info if available
      if (plantToAdd.careInfo) {
        // Convert watering text to frequency in days
        if (plantToAdd.careInfo.waterFrequency) {
          const waterText = plantToAdd.careInfo.waterFrequency.toLowerCase();
          if (waterText.includes("daily") || waterText.includes("every day")) {
            setWaterFrequency("1");
          } else if (waterText.includes("twice")) {
            setWaterFrequency("3");
          } else if (waterText.includes("weekly") || waterText.includes("every week")) {
            setWaterFrequency("7");
          } else if (waterText.includes("biweekly") || waterText.includes("every two week")) {
            setWaterFrequency("14");
          } else if (waterText.includes("monthly") || waterText.includes("every month")) {
            setWaterFrequency("30");
          } else if (waterText.includes("infrequent") || waterText.includes("rarely")) {
            setWaterFrequency("45");
          } else {
            setWaterFrequency("7"); // default
          }
        }
        
        // Set light needs
        if (plantToAdd.careInfo.lightNeeds) {
          const lightText = plantToAdd.careInfo.lightNeeds.toLowerCase();
          if (lightText.includes("low") || lightText.includes("shade")) {
            setLightNeeds("low");
          } else if (lightText.includes("bright") || lightText.includes("high") || lightText.includes("direct")) {
            setLightNeeds("high");
          } else {
            setLightNeeds("medium");
          }
        }
        
        // Set notes
        if (plantToAdd.careInfo.notes) {
          setNotes(plantToAdd.careInfo.notes);
        }
      }
    } else {
      // Reset form
      setName("");
      setScientificName("");
      setImageUrl("");
      setWaterFrequency("7");
      setFertilizeFrequency("30");
      setLightNeeds("medium");
      setNotes("");
    }
  }, [plantToAdd, showModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) {
      toast({
        title: "Missing information",
        description: "Please provide a name for your plant.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const plantData = {
        name,
        scientificName: scientificName || undefined,
        imageUrl: imageUrl || undefined,
        waterFrequency: parseInt(waterFrequency),
        fertilizeFrequency: parseInt(fertilizeFrequency),
        lightNeeds,
        notes: notes || undefined,
      };
      
      // Track the analytics event
      trackEvent(AnalyticsEvent.ADDED_PLANT, {
        plantName: name,
        scientificName: scientificName || undefined,
        source: plantToAdd ? 'identification' : 'manual_entry'
      });
      
      await apiRequest("POST", "/api/plants", plantData);
      
      // Refresh plant lists
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      
      toast({
        title: "Plant added",
        description: `${name} has been added to your collection!`,
      });
      
      closeModal();
    } catch (error) {
      console.error("Error adding plant:", error);
      toast({
        title: "Error",
        description: "Failed to add plant. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={closeModal}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-[Outfit] text-lg">Add New Plant</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Plant Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="E.g., Monstera"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="scientific-name" className="text-sm font-medium">Scientific Name</Label>
              <Input
                id="scientific-name"
                value={scientificName}
                onChange={(e) => setScientificName(e.target.value)}
                placeholder="E.g., Monstera deliciosa"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="image-url" className="text-sm font-medium">Image URL</Label>
            <Input
              id="image-url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/plant-image.jpg"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="water-frequency" className="text-sm font-medium">Water Frequency</Label>
              <Select value={waterFrequency} onValueChange={setWaterFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Every day</SelectItem>
                  <SelectItem value="3">Every 2-3 days</SelectItem>
                  <SelectItem value="7">Weekly</SelectItem>
                  <SelectItem value="14">Every 2 weeks</SelectItem>
                  <SelectItem value="30">Monthly</SelectItem>
                  <SelectItem value="45">Infrequently</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fertilize-frequency" className="text-sm font-medium">Fertilize Frequency</Label>
              <Select value={fertilizeFrequency} onValueChange={setFertilizeFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Weekly</SelectItem>
                  <SelectItem value="14">Every 2 weeks</SelectItem>
                  <SelectItem value="30">Monthly</SelectItem>
                  <SelectItem value="90">Quarterly</SelectItem>
                  <SelectItem value="180">Twice a year</SelectItem>
                  <SelectItem value="365">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="light-needs" className="text-sm font-medium">Light Needs</Label>
            <Select value={lightNeeds} onValueChange={setLightNeeds}>
              <SelectTrigger>
                <SelectValue placeholder="Select light needs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low Light</SelectItem>
                <SelectItem value="medium">Medium Light</SelectItem>
                <SelectItem value="high">Bright Light</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special care instructions or notes about your plant..."
              rows={3}
            />
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              type="button" 
              onClick={closeModal}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Adding..." : "Add Plant"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
