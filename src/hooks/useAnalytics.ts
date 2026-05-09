import { useEffect } from "react";

/**
 * Replace with your server's public IP or domain.
 * Example: "http://1.2.3.4:3000" or "https://analytics.yourdomain.com"
 */
const ANALYTICS_URL = "http://78.40.163.82:3001";

export function useAnalytics() {
  useEffect(() => {
    // Generate or retrieve a persistent unique ID for this installation
    let userId = localStorage.getItem("lp_analytics_id");
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem("lp_analytics_id", userId);
    }

    const sendHeartbeat = async () => {
      try {
        await fetch(`${ANALYTICS_URL}/heartbeat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        });
      } catch (err) {
        // Silently ignore errors to avoid affecting user experience
        console.warn("Analytics heartbeat failed:", err);
      }
    };

    // Send initial heartbeat on mount
    sendHeartbeat();

    // Send heartbeat every 2 minutes (120,000 ms)
    const interval = setInterval(sendHeartbeat, 120 * 1000);

    return () => clearInterval(interval);
  }, []);
}
