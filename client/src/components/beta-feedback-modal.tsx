import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface BetaFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BetaFeedbackModal({ isOpen, onClose }: BetaFeedbackModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [feedbackType, setFeedbackType] = useState<string>("suggestion");
  const [feedbackText, setFeedbackText] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async () => {
    if (!feedbackText.trim()) {
      toast({
        title: "Error",
        description: "Please enter your feedback before submitting.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await apiRequest("POST", "/api/beta-feedback", {
        type: feedbackType,
        feedback: feedbackText,
        email: user?.email,
      });

      if (response.ok) {
        toast({
          title: "Feedback Submitted",
          description: "Thank you for your feedback! We value your input as a beta tester.",
        });
        
        setFeedbackText("");
        setFeedbackType("suggestion");
        onClose();
      } else {
        throw new Error("Failed to submit feedback");
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Error",
        description: "There was a problem submitting your feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <span className="material-icons text-[#4CAF50] mr-2">bug_report</span>
            Beta Tester Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve SnapThePlant with your valuable feedback. As a beta tester, your insights are crucial to our development.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <div className="space-y-2">
            <Label htmlFor="feedbackType">Feedback Type</Label>
            <Select
              value={feedbackType}
              onValueChange={setFeedbackType}
            >
              <SelectTrigger id="feedbackType">
                <SelectValue placeholder="Select feedback type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="suggestion">Suggestion</SelectItem>
                <SelectItem value="bug">Bug Report</SelectItem>
                <SelectItem value="feature">Feature Request</SelectItem>
                <SelectItem value="usability">Usability Issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedbackText">Your Feedback</Label>
            <Textarea
              id="feedbackText"
              placeholder="Please describe your feedback in detail. For bugs, include steps to reproduce the issue."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-[#4CAF50] hover:bg-[#3B8C3F] text-white"
          >
            {isSubmitting ? (
              <>
                <span className="material-icons animate-spin mr-2 text-sm">refresh</span>
                Submitting...
              </>
            ) : (
              "Submit Feedback"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}