import { useState } from "react";
import { format, formatDistanceToNow, isBefore, addDays } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PlantCardProps {
  plant: any;
  onDelete?: (id: number) => void;
}

export function PlantCard({ plant, onDelete }: PlantCardProps) {
  const { toast } = useToast();
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  // Calculate watering status
  const lastWatered = plant.lastWatered ? new Date(plant.lastWatered) : null;
  const waterDueDate = lastWatered ? addDays(lastWatered, plant.waterFrequency) : null;
  const isWaterOverdue = waterDueDate ? isBefore(waterDueDate, new Date()) : false;
  const daysUntilWatering = waterDueDate 
    ? formatDistanceToNow(waterDueDate, { addSuffix: true }) 
    : "Unknown";
  
  // Calculate water level percentage
  const calculateWaterPercentage = () => {
    if (!lastWatered || !plant.waterFrequency) return 0;
    
    const now = new Date();
    const daysSinceWatered = Math.max(0, Math.floor((now.getTime() - lastWatered.getTime()) / (1000 * 60 * 60 * 24)));
    const percentageRemaining = Math.max(0, 100 - (daysSinceWatered / plant.waterFrequency * 100));
    
    return percentageRemaining;
  };

  const waterPercentage = calculateWaterPercentage();

  // Handle plant watering
  const handleWaterPlant = async () => {
    try {
      await apiRequest('POST', `/api/plants/${plant.id}/water`);
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/care-actions/pending'] });
      
      toast({
        title: "Plant watered",
        description: `You've watered ${plant.name}. Great job!`,
      });
    } catch (error) {
      console.error("Error watering plant:", error);
      toast({
        title: "Error",
        description: "Failed to water plant. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (onDelete) {
      onDelete(plant.id);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card className="overflow-hidden rounded-xl shadow-sm bg-white plant-card group">
        <div className="relative h-48">
          {plant.imageUrl ? (
            <img 
              src={plant.imageUrl} 
              alt={plant.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#F5F5F0]">
              <span className="material-icons text-[#DEDED8] text-5xl">eco</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <div>
              <h3 className="font-[Outfit] text-white font-semibold text-lg">{plant.name}</h3>
              <p className="text-white/90 text-sm">{plant.scientificName || ""}</p>
            </div>
            <div className="flex space-x-1">
              <div className={`text-xs ${
                isWaterOverdue 
                  ? "bg-[#E53935]/90 text-white" 
                  : "bg-white text-[#4CAF50]"
              } rounded-full py-1 px-2 font-medium flex items-center`}>
                <span className="material-icons text-xs mr-1">water_drop</span>
                {waterDueDate 
                  ? isWaterOverdue 
                    ? "Now" 
                    : format(waterDueDate, "d") + "d"
                  : "?"}
              </div>
            </div>
          </div>
          <div className="absolute top-3 right-3 plant-actions flex space-x-1">
            <button 
              className="p-1.5 rounded-full bg-white/80 hover:bg-white text-[#4A4A4A]"
              onClick={() => setShowShareDialog(true)}
            >
              <span className="material-icons text-sm">share</span>
            </button>
            <button 
              className="p-1.5 rounded-full bg-white/80 hover:bg-white text-[#4A4A4A]"
              onClick={handleDeleteClick}
            >
              <span className="material-icons text-sm">delete</span>
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center mb-3">
            <span className="material-icons text-[#4A4A4A] text-sm mr-1">calendar_today</span>
            <span className="text-sm text-[#4A4A4A]">
              Added {plant.dateAdded ? format(new Date(plant.dateAdded), "MMMM d, yyyy") : ""}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="w-full">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-[#4A4A4A]">Water</span>
                <span className={`text-xs font-medium ${isWaterOverdue ? "text-[#E53935]" : ""}`}>
                  {isWaterOverdue ? "Overdue" : `Due ${daysUntilWatering}`}
                </span>
              </div>
              <div className="w-full bg-[#F5F5F0] rounded-full h-2">
                <div 
                  className={`${isWaterOverdue ? "bg-[#E53935]" : "bg-[#4CAF50]"} h-2 rounded-full`} 
                  style={{ width: `${waterPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full mt-4 bg-[#4CAF50] hover:bg-[#3B8C3F] text-white"
            onClick={handleWaterPlant}
          >
            <span className="material-icons mr-2 text-sm">water_drop</span>
            Water Plant
          </Button>
        </div>
      </Card>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share {plant.name}</DialogTitle>
            <DialogDescription>
              Share your plant with the Plantify community.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="flex justify-center">
              {plant.imageUrl ? (
                <img 
                  src={plant.imageUrl} 
                  alt={plant.name} 
                  className="h-40 object-cover rounded-md"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center bg-[#F5F5F0] rounded-md">
                  <span className="material-icons text-[#DEDED8] text-5xl">eco</span>
                </div>
              )}
            </div>
            <p className="text-center text-sm text-[#4A4A4A]">
              This feature is coming soon! You'll be able to share your plants with friends and the Plantify community.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Plant</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {plant.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
