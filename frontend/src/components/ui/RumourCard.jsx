import { motion } from "framer-motion";
import MotionText from "./MotionText";
import MotionCard from "./MotionCard";
import { Clock } from "lucide-react";

const RumourCard = ({ post, isDarkMode, onClick }) => {
  // Truncate claim to ~100 characters
  const truncatedClaim =
    post.claim.length > 100 ? `${post.claim.substring(0, 100)}...` : post.claim;

  // Format timestamp to relative time
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const postTime = new Date(timestamp);
    const diffInHours = Math.floor((now - postTime) / (1000 * 60 * 60));

    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return postTime.toLocaleDateString();
  };

  // Get verdict color and styling
  const getVerdictStyling = (verdict) => {
    // Fallback to "unverified" if verdict is missing
    switch (verdict?.toLowerCase() || "unverified") {
      case "true":
        return {
          bg: isDarkMode ? "bg-green-900" : "bg-green-50",
          text: isDarkMode ? "text-green-200" : "text-green-800",
          border: "border-green-500",
        };
      case "false":
        return {
          bg: isDarkMode ? "bg-red-900" : "bg-red-50",
          text: isDarkMode ? "text-red-200" : "text-red-800",
          border: "border-red-500",
        };
      case "mostly true":
        return {
          bg: isDarkMode ? "bg-green-900" : "bg-green-50",
          text: isDarkMode ? "text-green-200" : "text-green-800",
          border: "border-green-400",
        };
      case "disputed":
        return {
          bg: isDarkMode ? "bg-orange-900" : "bg-orange-50",
          text: isDarkMode ? "text-orange-200" : "text-orange-800",
          border: "border-orange-500",
        };
      case "unverified":
      default:
        return {
          bg: isDarkMode ? "bg-yellow-900" : "bg-yellow-50",
          text: isDarkMode ? "text-yellow-200" : "text-yellow-800",
          border: "border-yellow-500",
        };
    }
  };

  // Use optional chaining to prevent crash if verification or verdict is missing
  const verdictStyling = getVerdictStyling(post.verification?.verdict);

  return (
    <MotionCard
      className="p-4 rounded-lg border cursor-pointer"
      isDarkMode={isDarkMode}
      darkBackgroundColor="#1f2937"
      lightBackgroundColor="#ffffff"
      darkBorderColor="#374151"
      lightBorderColor="#e5e7eb"
      whileHover={{
        backgroundColor: isDarkMode ? "#374151" : "#f9fafb",
        scale: 1.02,
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {/* Claim Text */}
      <MotionText
        className="text-sm font-medium mb-3 leading-relaxed"
        isDarkMode={isDarkMode}
        darkColor="#ffffff"
        lightColor="#111827"
      >
        {truncatedClaim}
      </MotionText>

      {/* Verdict Badge and Timestamp */}
      <div className="flex items-center justify-between">
        <motion.span
          className={`px-2 py-1 rounded-full text-xs font-medium border ${verdictStyling.bg} ${verdictStyling.text} ${verdictStyling.border}`}
          animate={{
            backgroundColor: verdictStyling.bg.includes("green")
              ? isDarkMode
                ? "#14532d"
                : "#f0fdf4"
              : verdictStyling.bg.includes("red")
              ? isDarkMode
                ? "#7f1d1d"
                : "#fef2f2"
              : verdictStyling.bg.includes("orange")
              ? isDarkMode
                ? "#9a3412"
                : "#fff7ed"
              : isDarkMode
              ? "#78350f"
              : "#fefce8",
            color: verdictStyling.text.includes("green")
              ? isDarkMode
                ? "#bbf7d0"
                : "#166534"
              : verdictStyling.text.includes("red")
              ? isDarkMode
                ? "#fecaca"
                : "#dc2626"
              : verdictStyling.text.includes("orange")
              ? isDarkMode
                ? "#fed7aa"
                : "#ea580c"
              : isDarkMode
              ? "#fde68a"
              : "#92400e",
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut",
          }}
        >
          {/* Display verdict, with a fallback */}
          {post.verification?.verdict || "Unverified"}
        </motion.span>

        <div className="flex items-center space-x-1">
          <Clock
            className={`w-3 h-3 ${
              isDarkMode ? "text-gray-400" : "text-gray-500"
            }`}
          />
          <MotionText
            className="text-xs"
            isDarkMode={isDarkMode}
            darkColor="#9ca3af"
            lightColor="#6b7280"
          >
            {/* Use optional chaining for the date as well */}
            {formatTimestamp(post.verification?.verification_date)}
          </MotionText>
        </div>
      </div>
    </MotionCard>
  );
};

export default RumourCard;
