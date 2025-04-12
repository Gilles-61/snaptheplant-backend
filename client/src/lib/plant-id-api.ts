import axios from 'axios';

// Ensure API key is available from environment variables
const PLANT_ID_API_KEY = import.meta.env.VITE_PLANT_ID_API_KEY;

// Interface for plant identification response
interface PlantIdResponse {
  id: string;
  custom_id: string | null;
  meta_data: {
    date: string;
    datetime: string;
  };
  uploaded_datetime: string;
  finished_datetime: string;
  images: string[];
  modifiers: string[];
  secret: string;
  fail_cause: string | null;
  countable: boolean;
  feedback: string | null;
  is_plant: {
    probability: number;
    binary: boolean;
    threshold: number;
  };
  is_plant_probability: number;
  classification: {
    suggestions: PlantSuggestion[];
  };
  suggestions: PlantSuggestion[];
  health_assessment: any;
  disease: any;
}

// Interface for plant suggestion
interface PlantSuggestion {
  id: string;
  name: string;
  probability: number;
  similar_images: string[];
  plant_name: string;
  plant_details: {
    common_names?: string[];
    url?: string;
    wiki_description?: {
      value: string;
      citation: string;
      license_name: string;
      license_url: string;
    };
    taxonomy?: {
      class: string;
      family: string;
      genus: string;
      kingdom: string;
      order: string;
      phylum: string;
    };
    synonyms?: string[];
    watering?: {
      max: number;
      min: number;
      text: string;
    };
    propagation?: string[];
    scientific_name?: string;
    care_level?: string;
  };
}

/**
 * Identifies a plant from an image
 * @param imageBase64 Base64 encoded image string
 * @returns Promise with plant identification results
 */
export async function identifyPlant(imageBase64: string): Promise<PlantIdResponse> {
  if (!PLANT_ID_API_KEY) {
    throw new Error('Plant.id API key is not configured');
  }

  try {
    const response = await axios.post(
      'https://api.plant.id/v2https://snaptheplantcom.gillesnobert.repl.co/identify',
      {
        images: [imageBase64],
        modifiers: ["crops_fast", "similar_images"],
        plant_language: "en",
        plant_details: [
          "common_names",
          "url",
          "wiki_description",
          "taxonomy",
          "synonyms",
          "watering",
          "propagation"
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Api-Key': PLANT_ID_API_KEY
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error in Plant.id API call:', error);
    throw error;
  }
}

/**
 * Extracts care instructions from plant identification data
 * @param plantData Plant identification suggestion
 * @returns Object with care instructions
 */
export function extractCareInstructions(plantData: PlantSuggestion) {
  const details = plantData.plant_details;
  
  return {
    name: plantData.plant_name,
    scientificName: details?.scientific_name || '',
    wateringInstructions: details?.watering?.text || 'Water regularly',
    lightNeeds: details?.care_level || 'Medium light',
    description: details?.wiki_description?.value || '',
    careLevel: details?.care_level || 'Medium',
    propagation: details?.propagation?.join(', ') || 'No propagation information available'
  };
}

export default {
  identifyPlant,
  extractCareInstructions
};
