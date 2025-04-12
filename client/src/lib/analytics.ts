import { apiRequest } from "./queryClient";

/**
 * Analytics events that can be tracked
 */
export enum AnalyticsEvent {
  STARTED_TRIAL = "started_trial",
  ENDED_TRIAL = "ended_trial",
  SUBSCRIBED_MONTHLY = "subscribed_monthly",
  PURCHASED_LIFETIME = "purchased_lifetime",
  DOWNLOADED_PRO_PACK = "downloaded_pro_pack",
  VIEWED_UPGRADE_PROMPT = "viewed_upgrade_prompt",
  CLICKED_GO_PRO = "clicked_go_pro",
  CANCELLED_SUBSCRIPTION = "cancelled_subscription",
  IDENTIFIED_PLANT = "identified_plant",
  ADDED_PLANT = "added_plant",
  MARKED_CARE_ACTION_COMPLETE = "marked_care_action_complete",
}

/**
 * Send an analytics event to be tracked on the server
 * @param event The event to track
 * @param properties Additional properties to track with the event
 */
export async function trackEvent(event: AnalyticsEvent, properties: Record<string, any> = {}) {
  try {
    await apiRequest("POST", "/api/analytics/track", {
      event,
      properties,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Fail silently, but log to console
    console.error("Failed to track analytics event:", error);
  }
}