import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Community() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [selectedPlantId, setSelectedPlantId] = useState<number | null>(null);
  
  // Fetch community shares
  const { data: communityShares, isLoading: sharesLoading } = useQuery({
    queryKey: ['/api/community'],
  });
  
  // Fetch user's plants for posting
  const { data: userPlants } = useQuery({
    queryKey: ['/api/plants'],
    enabled: !!user && isCreatingPost,
  });
  
  const handleCreatePost = async () => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to create a post.",
        variant: "destructive",
      });
      return;
    }
    
    if (!postTitle || !selectedPlantId) {
      toast({
        title: "Missing information",
        description: "Please provide a title and select a plant for your post.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest("POST", "/api/community", {
        plantId: selectedPlantId,
        title: postTitle,
        content: postContent,
      });
      
      // Reset form
      setPostTitle("");
      setPostContent("");
      setSelectedPlantId(null);
      setIsCreatingPost(false);
      
      // Refresh community shares
      queryClient.invalidateQueries({ queryKey: ['/api/community'] });
      
      toast({
        title: "Post created",
        description: "Your post has been shared with the community!",
      });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({
        title: "Error",
        description: "Failed to create post. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleLikePost = async (shareId: number) => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "You must be logged in to like posts.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest("POST", `/api/community/${shareId}/like`, {});
      
      // Refresh community shares
      queryClient.invalidateQueries({ queryKey: ['/api/community'] });
    } catch (error) {
      console.error("Error liking post:", error);
      toast({
        title: "Error",
        description: "Failed to like post. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="font-[Outfit] text-2xl md:text-3xl font-bold text-[#1A1A1A]">Plant Community</h1>
          <p className="text-[#4A4A4A] mt-1">Share and discover plant care tips with fellow enthusiasts.</p>
        </div>
        <div className="mt-4 md:mt-0">
          {!isCreatingPost ? (
            <Button 
              className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white flex items-center"
              onClick={() => setIsCreatingPost(true)}
            >
              <span className="material-icons mr-2">add</span>
              Share With Community
            </Button>
          ) : (
            <Button 
              variant="outline"
              onClick={() => setIsCreatingPost(false)}
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Create post form */}
      {isCreatingPost && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="font-[Outfit] text-lg font-semibold mb-4">Share Your Plant Experience</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select a plant</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {userPlants && userPlants.length > 0 ? (
                  userPlants.map((plant: any) => (
                    <div
                      key={plant.id}
                      className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                        selectedPlantId === plant.id
                          ? "border-[#4CAF50] bg-[#4CAF50]/10"
                          : "border-[#DEDED8] hover:border-[#4CAF50]/50"
                      }`}
                      onClick={() => setSelectedPlantId(plant.id)}
                    >
                      <div className="aspect-square bg-[#F5F5F0] rounded-md mb-2 overflow-hidden">
                        {plant.imageUrl ? (
                          <img 
                            src={plant.imageUrl} 
                            alt={plant.name} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-icons text-[#DEDED8] text-4xl">eco</span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-medium truncate">{plant.name}</div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-full text-center py-4">
                    <p className="text-[#4A4A4A]">You don't have any plants to share yet.</p>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label htmlFor="post-title" className="block text-sm font-medium mb-1">Title</label>
              <Input
                id="post-title"
                placeholder="E.g., My Monstera is thriving!"
                value={postTitle}
                onChange={(e) => setPostTitle(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="post-content" className="block text-sm font-medium mb-1">Content (optional)</label>
              <Textarea
                id="post-content"
                placeholder="Share your experience, tips, or questions..."
                rows={4}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setIsCreatingPost(false)}
              >
                Cancel
              </Button>
              <Button 
                className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white"
                onClick={handleCreatePost}
                disabled={!postTitle || !selectedPlantId}
              >
                Share Post
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Community posts */}
      <div className="space-y-6">
        {sharesLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl shadow-sm h-64 animate-pulse"></div>
            ))}
          </div>
        ) : communityShares && communityShares.length > 0 ? (
          communityShares.map((share: any) => (
            <div key={share.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
              {share.imageUrl && (
                <div className="h-48 bg-[#F5F5F0]">
                  <img 
                    src={share.imageUrl} 
                    alt={share.title} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="p-6">
                <h3 className="font-[Outfit] text-xl font-semibold mb-2">{share.title}</h3>
                
                {share.content && (
                  <p className="text-[#4A4A4A] mb-4">{share.content}</p>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-[#4CAF50] text-white flex items-center justify-center mr-2">
                      U
                    </div>
                    <div>
                      <div className="font-medium">User</div>
                      <div className="text-[#4A4A4A] text-xs">
                        {share.datePosted ? format(new Date(share.datePosted), "MMM d, yyyy") : ""}
                      </div>
                    </div>
                  </div>
                  
                  <button 
                    className="flex items-center text-[#4A4A4A] hover:text-[#4CAF50]"
                    onClick={() => handleLikePost(share.id)}
                  >
                    <span className="material-icons text-sm mr-1">favorite</span>
                    {share.likes || 0}
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <span className="material-icons text-[#FF9800] text-4xl mb-3">forum</span>
            <h3 className="font-medium text-xl mb-2">No community posts yet</h3>
            <p className="text-[#4A4A4A] mb-4">Be the first to share your plant care experience!</p>
            {!isCreatingPost && (
              <Button 
                className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white inline-flex items-center"
                onClick={() => setIsCreatingPost(true)}
              >
                <span className="material-icons mr-2">add</span>
                Create Post
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
