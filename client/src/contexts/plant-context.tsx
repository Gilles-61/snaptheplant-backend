import { createContext, useState, useContext, ReactNode } from "react";

// Define the type for plant data that might be passed to the add plant modal
interface PlantData {
  name: string;
  scientificName?: string;
  imageUrl?: string;
  careInfo?: {
    waterFrequency?: string;
    lightNeeds?: string;
    notes?: string;
  };
}

interface PlantContextType {
  showAddPlantModal: boolean;
  setShowAddPlantModal: (show: boolean, plant?: PlantData) => void;
  showIdentifyModal: boolean;
  setShowIdentifyModal: (show: boolean) => void;
  plantToAdd: PlantData | null;
}

const PlantContext = createContext<PlantContextType>({
  showAddPlantModal: false,
  setShowAddPlantModal: () => {},
  showIdentifyModal: false,
  setShowIdentifyModal: () => {},
  plantToAdd: null,
});

export function PlantProvider({ children }: { children: ReactNode }) {
  const [showAddPlantModal, setShowAddPlantModalState] = useState(false);
  const [showIdentifyModal, setShowIdentifyModalState] = useState(false);
  const [plantToAdd, setPlantToAdd] = useState<PlantData | null>(null);

  const setShowAddPlantModal = (show: boolean, plant?: PlantData) => {
    setShowAddPlantModalState(show);
    if (plant) {
      setPlantToAdd(plant);
    } else if (!show) {
      // Reset plant data when closing if no new plant is provided
      setPlantToAdd(null);
    }
  };

  const setShowIdentifyModal = (show: boolean) => {
    setShowIdentifyModalState(show);
  };

  return (
    <PlantContext.Provider
      value={{
        showAddPlantModal,
        setShowAddPlantModal,
        showIdentifyModal,
        setShowIdentifyModal,
        plantToAdd,
      }}
    >
      {children}
    </PlantContext.Provider>
  );
}

export function usePlant() {
  return useContext(PlantContext);
}
