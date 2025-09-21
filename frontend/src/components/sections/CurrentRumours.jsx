import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader2, Wifi, WifiOff, RefreshCw } from "lucide-react";
import RumourCard from "../ui/RumourCard";
import RumourModal from "../ui/RumourModal";
import MotionText from "../ui/MotionText";
import { useWebSocket } from "../../hooks/useWebSocket";
import mockRumoursData from "../../data/mockRumours.json";

// Transform MongoDB data to match frontend expectations
// Moved outside the component to make it a stable function
const transformMongoData = (mongoPosts) => {
  if (!Array.isArray(mongoPosts)) {
    console.error(
      "❌ transformMongoData received non-array input:",
      mongoPosts
    );
    return [];
  }

  return mongoPosts.map((post) => {
    // This function now handles both the new, clean data structure
    // and the old, more complex one.

    // Check if the post uses the new, simpler structure
    if (post.claim && post.verification) {
      return {
        ...post,
        verification: {
          ...post.verification,
          verification_date:
            post.verification.verification_date || post.stored_at,
        },
      };
    }

    // --- Fallback for the OLD data structure ---
    const claimText =
      post.claim?.text ||
      post.metadata?.original_verification?.claim_text ||
      post.claim?.claim_text ||
      "No claim text available";

    const verification = post.claim || {};
    const originalVerification = post.metadata?.original_verification || {};
    const details = post.metadata?.original_verification || {};

    const mapVerdict = (verdict) => {
      switch (verdict?.toLowerCase()) {
        case "true":
          return "True";
        case "false":
          return "False";
        case "uncertain":
          return "Disputed";
        default:
          return "Unverified";
      }
    };

    return {
      post_id: post.post_id || post._id,
      claim: claimText,
      summary:
        details.content_summary ||
        post.post_content?.summary ||
        "No summary available",
      platform: post.platform || "Social Media",
      Post_link: details.source || post.Post_link || "#",
      verification: {
        verified: verification.verified || false,
        verdict: mapVerdict(verification.verdict),
        message:
          originalVerification.verification?.message ||
          details.error ||
          "No verification message available",
        reasoning:
          originalVerification.verification?.message ||
          details.error ||
          "No reasoning available",
        sources: {
          links: details.source ? [details.source] : [],
          titles: ["Source"],
          count: details.source ? 1 : 0,
        },
        verification_date:
          post.verification_date || post.stored_at || new Date().toISOString(),
      },
    };
  });
};

const CurrentRumours = ({ isDarkMode }) => {
  const [rumours, setRumours] = useState([]);
  const [selectedRumour, setSelectedRumour] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((data) => {
    console.log("📨 WebSocket message received in CurrentRumours:", data);

    if (data.type === "new_post" && data.data?.post) {
      console.log("🆕 New post received via WebSocket:", data.data.post);

      // The incoming post is a single object, wrap it in an array for the transformer
      const transformedPosts = transformMongoData([data.data.post]);

      if (transformedPosts.length > 0) {
        const newPost = transformedPosts[0];

        setRumours((prevRumours) => {
          // Use post_id for a reliable duplicate check
          const exists = prevRumours.some(
            (rumour) => rumour.post_id === newPost.post_id
          );

          if (!exists) {
            console.log("✅ Adding new post to rumours list:", newPost);
            return [newPost, ...prevRumours].slice(0, 10); // Keep only latest 10
          } else {
            console.log(
              "⚠️ Post already exists, skipping duplicate:",
              newPost.post_id
            );
            return prevRumours;
          }
        });

        setLastUpdateTime(new Date());
      }
    } else if (data.type === "pong") {
      console.log("🏓 Pong received:", data.message);
    } else if (data.type === "ping") {
      console.log("🏓 Ping received:", data.message);
      // Just update the timestamp for ping messages
      setLastUpdateTime(new Date());
    }
  }, []);

  // WebSocket connection handlers
  const handleWebSocketOpen = useCallback(() => {
    console.log("✅ WebSocket connected for real-time updates");
  }, []);

  const handleWebSocketClose = useCallback(() => {
    console.log("🔌 WebSocket disconnected");
  }, []);

  const handleWebSocketError = useCallback((error) => {
    console.error("❌ WebSocket error:", error);
  }, []);

  // Initialize WebSocket connection
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

  const {
    isConnected,
    error: wsError,
    reconnect,
  } = useWebSocket(wsUrl, {
    onOpen: handleWebSocketOpen,
    onClose: handleWebSocketClose,
    onMessage: handleWebSocketMessage,
    onError: handleWebSocketError,
  });

  // Fetch recent posts from MongoDB API
  const fetchRecentPosts = async () => {
    try {
      console.log("🔍 DEBUG: Starting fetchRecentPosts");
      setIsLoading(true);
      setError(null);

      const apiUrl = "/mongodb/recent-posts?limit=5";
      console.log("🔍 DEBUG: Making request to:", apiUrl);

      const response = await fetch(apiUrl);
      console.log("🔍 DEBUG: Response status:", response.status);
      console.log("🔍 DEBUG: Response ok:", response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.log("🔍 DEBUG: Error response text:", errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("🔍 DEBUG: Response data:", data);
      console.log("🔍 DEBUG: Data success:", data.success);
      console.log("🔍 DEBUG: Data posts length:", data.posts?.length);

      if (data.success && data.posts) {
        console.log("🔍 DEBUG: Transforming posts...");
        const transformedPosts = transformMongoData(data.posts);
        console.log("🔍 DEBUG: Transformed posts:", transformedPosts);
        setRumours(transformedPosts);
        setLastUpdateTime(new Date());
        console.log(
          "🔍 DEBUG: Set rumours state with",
          transformedPosts.length,
          "posts"
        );
      } else {
        console.log("🔍 DEBUG: API response not successful or no posts");
        throw new Error("Failed to fetch posts from API");
      }
    } catch (err) {
      console.error("❌ DEBUG: Error in fetchRecentPosts:", err);
      console.error("🔍 DEBUG: Error message:", err.message);
      console.error("🔍 DEBUG: Error stack:", err.stack);
      setError(err.message);
      // Fallback to mock data on error
      console.log("🔍 DEBUG: Falling back to mock data");
      setRumours(mockRumoursData.posts);
    } finally {
      console.log("🔍 DEBUG: Setting loading to false");
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentPosts();
  }, []);

  const handleRumourClick = (rumour) => {
    setSelectedRumour(rumour);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRumour(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className={`p-4 border-t ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <MotionText
              className="text-lg font-semibold"
              isDarkMode={isDarkMode}
              darkColor="#ffffff"
              lightColor="#111827"
            >
              Current Rumours
            </MotionText>
          </div>
        </div>

        {/* Scrollable Rumours List */}
        <motion.div
          className="max-h-115 overflow-y-auto space-y-3 pr-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {isLoading ? (
            <motion.div
              className={`text-center py-8 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
              }}
            >
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin opacity-50" />
              <MotionText
                className="text-sm"
                isDarkMode={isDarkMode}
                darkColor="#9ca3af"
                lightColor="#6b7280"
              >
                Loading recent rumours...
              </MotionText>
            </motion.div>
          ) : error ? (
            <motion.div
              className={`text-center py-8 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
              }}
            >
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <MotionText
                className="text-sm"
                isDarkMode={isDarkMode}
                darkColor="#9ca3af"
                lightColor="#6b7280"
              >
                Error loading rumours: {error}
              </MotionText>
              <MotionText
                className="text-xs mt-2"
                isDarkMode={isDarkMode}
                darkColor="#6b7280"
                lightColor="#9ca3af"
              >
                Showing sample data instead
              </MotionText>
            </motion.div>
          ) : rumours.length > 0 ? (
            rumours.map((rumour, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut",
                }}
              >
                <RumourCard
                  post={rumour}
                  isDarkMode={isDarkMode}
                  onClick={() => handleRumourClick(rumour)}
                />
              </motion.div>
            ))
          ) : (
            <motion.div
              className={`text-center py-8 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
              }}
            >
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <MotionText
                className="text-sm"
                isDarkMode={isDarkMode}
                darkColor="#9ca3af"
                lightColor="#6b7280"
              >
                No rumours to display
              </MotionText>
            </motion.div>
          )}
        </motion.div>

        {/* Manual Refresh Button with Status */}
        <div className="flex items-center justify-between mt-4">
          {/* Connection Status and Last Update */}
          <div className="flex items-center space-x-3">
            {/* Real-time Status */}
            <div className="flex items-center space-x-1">
              {isConnected ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              <MotionText
                className="text-xs"
                isDarkMode={isDarkMode}
                darkColor={isConnected ? "#10b981" : "#ef4444"}
                lightColor={isConnected ? "#059669" : "#dc2626"}
              >
                {isConnected ? "Live" : "Offline"}
              </MotionText>
            </div>

            {/* Last Update Time */}
            {lastUpdateTime && (
              <MotionText
                className="text-xs"
                isDarkMode={isDarkMode}
                darkColor="#9ca3af"
                lightColor="#6b7280"
              >
                Updated {lastUpdateTime.toLocaleTimeString()}
              </MotionText>
            )}

            {/* Reconnect Button (when disconnected) */}
            {!isConnected && (
              <button
                onClick={reconnect}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Reconnect"
              >
                <RefreshCw className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>

          {/* Manual Refresh Button */}
          <button
            onClick={fetchRecentPosts}
            disabled={isLoading}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isDarkMode
                ? "bg-gray-700 hover:bg-gray-600 text-gray-200 disabled:opacity-50"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700 disabled:opacity-50"
            }`}
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span>{isLoading ? "Refreshing..." : "Refresh"}</span>
          </button>
        </div>
      </motion.div>

      {/* Modal */}
      <RumourModal
        post={selectedRumour}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isDarkMode={isDarkMode}
      />
    </>
  );
};

export default CurrentRumours;
