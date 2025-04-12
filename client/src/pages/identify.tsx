import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { usePlant } from "@/contexts/plant-context";
import { AddPlantModal } from "@/components/add-plant-modal";
import { useLocation } from "wouter";

export default function Identify() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { setShowAddPlantModal } = usePlant();
  const [, navigate] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [selectedPlant, setSelectedPlant] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // Create preview URL
      const objectUrl = URL.createObjectURL(selectedFile);
      setPreviewUrl(objectUrl);
      
      // Reset results
      setResults(null);
      setSelectedPlant(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      
      // Create preview URL
      const objectUrl = URL.createObjectURL(droppedFile);
      setPreviewUrl(objectUrl);
      
      // Reset results
      setResults(null);
      setSelectedPlant(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const identifyPlant = async () => {
    if (!file) {
      toast({
        title: "No image selected",
        description: "Please upload or take a photo of your plant first.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsIdentifying(true);
      
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/identify', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        // Handle need for subscription upgrade
        if (data.upgrade) {
          toast({
            title: "Identification limit reached",
            description: "You've used all your free identifications this month. Upgrade to Premium for unlimited identifications!",
            variant: "destructive",
          });
          navigate('/subscribe');
          return;
        }
        
        throw new Error(data.message || 'Failed to identify plant');
      }
      
      setResults(data);
      if (data.suggestions && data.suggestions.length > 0) {
        setSelectedPlant(data.suggestions[0]);
      }
    } catch (error) {
      console.error('Error identifying plant:', error);
      toast({
        title: "Identification failed",
        description: "We couldn't identify your plant. Please try again with a clearer image.",
        variant: "destructive",
      });
    } finally {
      setIsIdentifying(false);
    }
  };

  const addToCollection = () => {
    if (selectedPlant) {
      setShowAddPlantModal(true, {
        name: selectedPlant.plant_name,
        scientificName: selectedPlant.plant_details?.scientific_name || selectedPlant.plant_name,
        imageUrl: previewUrl || '',
        careInfo: {
          waterFrequency: selectedPlant.plant_details?.watering?.text || 'Regular watering needed',
          lightNeeds: selectedPlant.plant_details?.care_level || 'Medium light',
          notes: selectedPlant.plant_details?.wiki_description?.value || ''
        }
      });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 pt-6 md:p-8">
      <h1 className="font-[Outfit] text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
        Identify Your Plant
      </h1>
      
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        <div className="p-6">
          {!previewUrl ? (
            <div 
              className="bg-[#FAFAF2] rounded-xl p-8 flex flex-col items-center justify-center border-2 border-dashed border-[#DEDED8] h-64 cursor-pointer"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input 
                type="file" 
                id="file-input" 
                accept="image/*" 
                className="hidden" 
                onChange={handleFileChange}
              />
              <span className="material-icons text-4xl text-[#4A4A4A] mb-3">cloud_upload</span>
              <p className="text-center mb-2 font-medium">Drag & drop your plant photo</p>
              <p className="text-sm text-[#4A4A4A] text-center mb-4">or</p>
              <div className="flex space-x-3">
                <button 
                  className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <span className="material-icons mr-2">photo_camera</span>
                  Take Photo
                </button>
                <button 
                  className="bg-[#4A4A4A] hover:bg-[#1A1A1A] text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <span className="material-icons mr-2">folder</span>
                  Browse
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Plant preview" 
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button 
                  className="absolute top-2 right-2 bg-white/80 hover:bg-white p-1 rounded-full text-[#4A4A4A]"
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl(null);
                    setResults(null);
                    setSelectedPlant(null);
                  }}
                >
                  <span className="material-icons">close</span>
                </button>
              </div>
              
              <div className="flex flex-col">
                {!results ? (
                  <div className="flex flex-col h-full justify-between">
                    <div>
                      <h3 className="font-medium text-lg mb-2">Ready to identify</h3>
                      <p className="text-[#4A4A4A] mb-4">
                        Click the button below to identify your plant using our AI-powered recognition technology.
                      </p>
                    </div>
                    
                    <Button 
                      className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white w-full py-6"
                      onClick={identifyPlant}
                      disabled={isIdentifying}
                    >
                      {isIdentifying ? (
                        <>
                          <span className="material-icons animate-spin mr-2">refresh</span>
                          Identifying...
                        </>
                      ) : (
                        <>
                          <span className="material-icons mr-2">search</span>
                          Identify Plant
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div>
                    {selectedPlant && (
                      <>
                        <h3 className="font-[Outfit] font-semibold text-xl mb-1">{selectedPlant.plant_name}</h3>
                        <p className="text-[#4A4A4A] text-sm italic mb-3">
                          {selectedPlant.plant_details?.scientific_name || selectedPlant.plant_name}
                        </p>
                        
                        <div className="mb-3">
                          <div className="flex items-center text-sm mb-1">
                            <span className="material-icons text-xs mr-1 text-[#4CAF50]">check_circle</span>
                            <span className="font-medium">Confidence:</span>
                            <span className="ml-1">{Math.round(selectedPlant.probability * 100)}%</span>
                          </div>
                          
                          {selectedPlant.plant_details?.watering && (
                            <div className="flex items-center text-sm mb-1">
                              <span className="material-icons text-xs mr-1 text-[#4CAF50]">water_drop</span>
                              <span className="font-medium">Watering:</span>
                              <span className="ml-1">{selectedPlant.plant_details.watering.text}</span>
                            </div>
                          )}
                          
                          {selectedPlant.plant_details?.care_level && (
                            <div className="flex items-center text-sm mb-1">
                              <span className="material-icons text-xs mr-1 text-[#4CAF50]">emoji_objects</span>
                              <span className="font-medium">Care Level:</span>
                              <span className="ml-1">{selectedPlant.plant_details.care_level}</span>
                            </div>
                          )}
                        </div>
                        
                        <Button 
                          className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white mb-2 w-full"
                          onClick={addToCollection}
                        >
                          <span className="material-icons mr-2">add</span>
                          Add to My Plants
                        </Button>
                        
                        {results.suggestions.length > 1 && (
                          <div className="mt-3">
                            <h4 className="text-sm font-medium mb-2">Other possibilities:</h4>
                            <div className="flex flex-wrap gap-2">
                              {results.suggestions.slice(1, 4).map((suggestion: any, index: number) => (
                                <button
                                  key={index}
                                  className={`text-xs py-1 px-2 rounded-full border ${
                                    selectedPlant === suggestion
                                      ? 'bg-[#4CAF50] text-white border-[#4CAF50]'
                                      : 'bg-white text-[#4A4A4A] border-[#DEDED8] hover:border-[#4CAF50]'
                                  }`}
                                  onClick={() => setSelectedPlant(suggestion)}
                                >
                                  {suggestion.plant_name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-[#FAFAF2] border-t border-[#DEDED8] p-4 text-sm text-[#4A4A4A]">
          <p className="mb-2">
            <span className="material-icons text-xs align-middle mr-1">info</span>
            <strong>Tip:</strong> For better results, make sure your plant is well-lit and the photo is clear.
          </p>
          <p>
            <span className="material-icons text-xs align-middle mr-1">info</span>
            <strong>Free plan:</strong> {user?.identificationsRemaining} identifications remaining this month
          </p>
        </div>
      </div>
      
      <AddPlantModal />
    </div>
  );
}
