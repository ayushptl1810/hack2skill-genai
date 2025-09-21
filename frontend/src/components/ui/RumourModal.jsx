import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Clock, Shield, CheckCircle, AlertTriangle } from "lucide-react";
import MotionText from "./MotionText";
import MotionButton from "./MotionButton";

const RumourModal = ({ post, isOpen, onClose, isDarkMode }) => {
  if (!post) return null;

  // Format timestamp to readable date
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get verdict styling (same as RumourCard)
  const getVerdictStyling = (verdict) => {
    switch (verdict.toLowerCase()) {
      case "true":
        return {
          bg: isDarkMode ? "bg-green-900" : "bg-green-50",
          text: isDarkMode ? "text-green-200" : "text-green-800",
          border: "border-green-500",
          icon: CheckCircle
        };
      case "false":
        return {
          bg: isDarkMode ? "bg-red-900" : "bg-red-50",
          text: isDarkMode ? "text-red-200" : "text-red-800",
          border: "border-red-500",
          icon: AlertTriangle
        };
      case "mostly true":
        return {
          bg: isDarkMode ? "bg-green-900" : "bg-green-50",
          text: isDarkMode ? "text-green-200" : "text-green-800",
          border: "border-green-400",
          icon: CheckCircle
        };
      case "disputed":
        return {
          bg: isDarkMode ? "bg-orange-900" : "bg-orange-50",
          text: isDarkMode ? "text-orange-200" : "text-orange-800",
          border: "border-orange-500",
          icon: AlertTriangle
        };
      case "unverified":
      default:
        return {
          bg: isDarkMode ? "bg-yellow-900" : "bg-yellow-50",
          text: isDarkMode ? "text-yellow-200" : "text-yellow-800",
          border: "border-yellow-500",
          icon: Shield
        };
    }
  };

  const verdictStyling = getVerdictStyling(post.verification.verdict);
  const VerdictIcon = verdictStyling.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 backdrop-blur-sm"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal Content */}
          <motion.div
            className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl ${
              isDarkMode ? "bg-gray-800" : "bg-white"
            }`}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between p-6 border-b ${
              isDarkMode ? "border-gray-700" : "border-gray-200"
            }`}>
              <MotionText
                className="text-xl font-semibold"
                isDarkMode={isDarkMode}
                darkColor="#ffffff"
                lightColor="#111827"
              >
                Fact Check Details
              </MotionText>
              <MotionButton
                onClick={onClose}
                className="p-2 rounded-lg"
                isDarkMode={isDarkMode}
                darkBackgroundColor="transparent"
                lightBackgroundColor="transparent"
                darkColor="#9ca3af"
                lightColor="#6b7280"
              >
                <X className="w-5 h-5" />
              </MotionButton>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Claim */}
              <div>
                <MotionText
                  className="text-sm font-medium mb-2"
                  isDarkMode={isDarkMode}
                  darkColor="#9ca3af"
                  lightColor="#6b7280"
                >
                  CLAIM
                </MotionText>
                <MotionText
                  className="text-base leading-relaxed"
                  isDarkMode={isDarkMode}
                  darkColor="#ffffff"
                  lightColor="#111827"
                >
                  {post.claim}
                </MotionText>
              </div>

              {/* Verdict */}
              <div>
                <MotionText
                  className="text-sm font-medium mb-2"
                  isDarkMode={isDarkMode}
                  darkColor="#9ca3af"
                  lightColor="#6b7280"
                >
                  VERDICT
                </MotionText>
                <motion.div
                  className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg border ${verdictStyling.bg} ${verdictStyling.text} ${verdictStyling.border}`}
                  animate={{
                    backgroundColor: verdictStyling.bg.includes("green") 
                      ? (isDarkMode ? "#14532d" : "#f0fdf4")
                      : verdictStyling.bg.includes("red")
                      ? (isDarkMode ? "#7f1d1d" : "#fef2f2")
                      : verdictStyling.bg.includes("orange")
                      ? (isDarkMode ? "#9a3412" : "#fff7ed")
                      : (isDarkMode ? "#78350f" : "#fefce8")
                  }}
                >
                  <VerdictIcon className="w-4 h-4" />
                  <span className="font-medium">{post.verification.verdict}</span>
                </motion.div>
              </div>

              {/* Summary */}
              <div>
                <MotionText
                  className="text-sm font-medium mb-2"
                  isDarkMode={isDarkMode}
                  darkColor="#9ca3af"
                  lightColor="#6b7280"
                >
                  SUMMARY
                </MotionText>
                <MotionText
                  className="text-sm leading-relaxed"
                  isDarkMode={isDarkMode}
                  darkColor="#d1d5db"
                  lightColor="#374151"
                >
                  {post.summary}
                </MotionText>
              </div>

              {/* Verification Message */}
              <div>
                <MotionText
                  className="text-sm font-medium mb-2"
                  isDarkMode={isDarkMode}
                  darkColor="#9ca3af"
                  lightColor="#6b7280"
                >
                  VERIFICATION MESSAGE
                </MotionText>
                <MotionText
                  className="text-sm leading-relaxed"
                  isDarkMode={isDarkMode}
                  darkColor="#d1d5db"
                  lightColor="#374151"
                >
                  {post.verification.message}
                </MotionText>
              </div>

              {/* Reasoning */}
              <div>
                <MotionText
                  className="text-sm font-medium mb-2"
                  isDarkMode={isDarkMode}
                  darkColor="#9ca3af"
                  lightColor="#6b7280"
                >
                  REASONING
                </MotionText>
                <MotionText
                  className="text-sm leading-relaxed"
                  isDarkMode={isDarkMode}
                  darkColor="#d1d5db"
                  lightColor="#374151"
                >
                  {post.verification.reasoning}
                </MotionText>
              </div>

              {/* Sources */}
              {post.verification.sources && post.verification.sources.count > 0 && (
                <div>
                  <MotionText
                    className="text-sm font-medium mb-2"
                    isDarkMode={isDarkMode}
                    darkColor="#9ca3af"
                    lightColor="#6b7280"
                  >
                    SOURCES ({post.verification.sources.count})
                  </MotionText>
                  <div className="space-y-2">
                    {post.verification.sources.links.map((link, index) => (
                      <motion.a
                        key={index}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center space-x-2 p-2 rounded-lg border transition-colors ${
                          isDarkMode 
                            ? "border-gray-600 hover:border-gray-500 hover:bg-gray-700" 
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ExternalLink className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                        <MotionText
                          className="text-sm flex-1 truncate"
                          isDarkMode={isDarkMode}
                          darkColor="#bfdbfe"
                          lightColor="#1e40af"
                        >
                          {post.verification.sources.titles[index] || link}
                        </MotionText>
                      </motion.a>
                    ))}
                  </div>
                </div>
              )}

              {/* Original Post Link */}
              {post.Post_link && (
                <div>
                  <MotionText
                    className="text-sm font-medium mb-2"
                    isDarkMode={isDarkMode}
                    darkColor="#9ca3af"
                    lightColor="#6b7280"
                  >
                    ORIGINAL POST
                  </MotionText>
                  <motion.a
                    href={post.Post_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center space-x-2 p-2 rounded-lg border transition-colors ${
                      isDarkMode 
                        ? "border-gray-600 hover:border-gray-500 hover:bg-gray-700" 
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <ExternalLink className={`w-4 h-4 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`} />
                    <MotionText
                      className="text-sm"
                      isDarkMode={isDarkMode}
                      darkColor="#bfdbfe"
                      lightColor="#1e40af"
                    >
                      View on {post.platform}
                    </MotionText>
                  </motion.a>
                </div>
              )}

              {/* Verification Date */}
              <div className="flex items-center space-x-2">
                <Clock className={`w-4 h-4 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`} />
                <MotionText
                  className="text-xs"
                  isDarkMode={isDarkMode}
                  darkColor="#9ca3af"
                  lightColor="#6b7280"
                >
                  Verified on {formatDate(post.verification.verification_date)}
                </MotionText>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RumourModal;
