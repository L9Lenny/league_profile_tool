import { useEffect } from "react";

/**
 * Replace with your server's public IP or domain.
 * Example: "http://1.2.3.4:3000" or "https://analytics.yourdomain.com"
 */
const ANALYTICS_URL = "http://downloadsbadge.duckdns.org:3001";

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
        // Use a 5 second timeout for the request itself
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch(`${ANALYTICS_URL}/heartbeat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
      } catch (err) {
        // Silently ignore
      }
    };

    // Delay the initial heartbeat to prioritize app startup
    const initialDelay = setTimeout(sendHeartbeat, 2000);

    // Send heartbeat every 2 minutes (120,000 ms)
    const interval = setInterval(sendHeartbeat, 120 * 1000);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, []);
}
