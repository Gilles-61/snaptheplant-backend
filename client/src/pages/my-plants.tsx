import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { usePlant } from "@/contexts/plant-context";
import { PlantCard } from "@/components/plant-card";
import { AddPlantModal } from "@/components/add-plant-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";

export default function MyPlants() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { showAddPlantModal, setShowAddPlantModal } = usePlant();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBy, setFilterBy] = useState("all");

  // Fetch plants
  const { 
    data: plants, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/plants'],
    enabled: !!user,
  });

  // Handle deleting a plant
  const handleDeletePlant = async (plantId: number) => {
    try {
      await apiRequest('DELETE', `/api/plants/${plantId}`);
      refetch();
      toast({
        title: "Plant deleted",
        description: "Your plant has been removed from your collection.",
      });
    } catch (error) {
      console.error("Error deleting plant:", error);
      toast({
        title: "Error",
        description: "Failed to delete plant. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Filter and search plants
  const filteredPlants = plants ? plants.filter(plant => {
    // Apply search term filter
    const matchesSearch = plant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (plant.scientificName && plant.scientificName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Apply category filter
    if (filterBy === "all") return matchesSearch;
    if (filterBy === "needsWater") {
      // If last watered is more than waterFrequency days ago
      if (!plant.lastWatered) return matchesSearch;
      const lastWatered = new Date(plant.lastWatered);
      const daysAgo = Math.floor((Date.now() - lastWatered.getTime()) / (1000 * 60 * 60 * 24));
      return matchesSearch && daysAgo >= plant.waterFrequency;
    }
    
    return matchesSearch;
  }) : [];

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="font-[Outfit] text-2xl md:text-3xl font-bold text-[#1A1A1A]">My Plant Collection</h1>
          <p className="text-[#4A4A4A] mt-1">Manage and track all your plants in one place.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Button 
            className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white flex items-center"
            onClick={() => setShowAddPlantModal(true)}
          >
            <span className="material-icons mr-2">add</span>
            Add New Plant
          </Button>
        </div>
      </div>

      {/* Search and filter controls */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Input
            className="pl-10"
            placeholder="Search plants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="material-icons absolute left-3 top-1/2 transform -translate-y-1/2 text-[#4A4A4A]">search</span>
        </div>
        <div className="flex gap-2">
          <Button
            variant={filterBy === "all" ? "default" : "outline"}
            className={filterBy === "all" ? "bg-[#4CAF50] hover:bg-[#3B8C3F]" : ""}
            onClick={() => setFilterBy("all")}
          >
            All Plants
          </Button>
          <Button
            variant={filterBy === "needsWater" ? "default" : "outline"}
            className={filterBy === "needsWater" ? "bg-[#4CAF50] hover:bg-[#3B8C3F]" : ""}
            onClick={() => setFilterBy("needsWater")}
          >
            <span className="material-icons mr-1 text-sm">water_drop</span>
            Needs Water
          </Button>
        </div>
      </div>

      {/* Plants grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm h-64 animate-pulse"></div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <span className="material-icons text-[#E53935] text-4xl mb-3">error</span>
          <h3 className="font-medium text-xl mb-2">Error loading plants</h3>
          <p className="text-[#4A4A4A] mb-4">We couldn't load your plants. Please try again.</p>
          <Button 
            onClick={() => refetch()}
            className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white"
          >
            Retry
          </Button>
        </div>
      ) : filteredPlants.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlants.map(plant => (
            <PlantCard 
              key={plant.id} 
              plant={plant} 
              onDelete={() => handleDeletePlant(plant.id)}
            />
          ))}
        </div>
      ) : plants && plants.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <span className="material-icons text-[#FF9800] text-4xl mb-3">search</span>
          <h3 className="font-medium text-xl mb-2">No matching plants</h3>
          <p className="text-[#4A4A4A]">Try adjusting your search or filter criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <span className="material-icons text-[#FF9800] text-4xl mb-3">eco</span>
          <h3 className="font-medium text-xl mb-2">No plants yet</h3>
          <p className="text-[#4A4A4A] mb-4">Start building your plant collection by adding your first plant.</p>
          <Button 
            className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white inline-flex items-center"
            onClick={() => setShowAddPlantModal(true)}
          >
            <span className="material-icons mr-2">add</span>
            Add First Plant
          </Button>
        </div>
      )}

      <AddPlantModal isOpen={showAddPlantModal} onClose={() => setShowAddPlantModal(false)} />
    </div>
  );
}
