import React from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle } from "lucide-react";
import MotionText from "./MotionText";
import MotionCard from "./MotionCard";

const ModuleCard = ({
  module,
  isDarkMode,
  isCompleted,
  onClick,
  getModuleIcon,
}) => {
  return (
    <MotionCard
      className={`p-6 rounded-xl border-2 cursor-pointer ${
        isDarkMode
          ? "bg-gray-800 border-gray-700 hover:border-blue-500"
          : "bg-white border-gray-200 hover:border-blue-500"
      } ${isCompleted ? "ring-2 ring-green-500 border-green-500" : ""}`}
      isDarkMode={isDarkMode}
      darkBackgroundColor="#1f2937"
      lightBackgroundColor="#ffffff"
      darkBorderColor="#374151"
      lightBorderColor="#e5e7eb"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex items-start justify-between mb-4">
        <motion.div
          className={`p-3 rounded-lg ${
            isDarkMode ? "bg-blue-900" : "bg-blue-100"
          }`}
          animate={{
            backgroundColor: isDarkMode ? "#1e3a8a" : "#dbeafe",
          }}
          transition={{
            duration: 0.6,
            ease: "easeInOut",
          }}
        >
          {React.createElement(getModuleIcon(module.id), {
            className: "w-6 h-6",
          })}
        </motion.div>
        {isCompleted && (
          <motion.div
            animate={{
              color: "#10b981",
            }}
            transition={{
              duration: 0.6,
              ease: "easeInOut",
            }}
          >
            <CheckCircle className="w-6 h-6" />
          </motion.div>
        )}
      </div>

      <MotionText
        className="text-xl font-bold mb-2"
        isDarkMode={isDarkMode}
        darkColor="#ffffff"
        lightColor="#111827"
      >
        {module.title}
      </MotionText>

      <MotionText
        className="text-sm mb-4"
        isDarkMode={isDarkMode}
        darkColor="#d1d5db"
        lightColor="#4b5563"
      >
        {module.description}
      </MotionText>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <motion.div
            className="flex items-center space-x-2"
            animate={{
              color: isDarkMode ? "#9ca3af" : "#6b7280",
            }}
            transition={{
              duration: 0.6,
              ease: "easeInOut",
            }}
          >
            <Clock className="w-4 h-4" />
            <MotionText
              className="text-sm"
              isDarkMode={isDarkMode}
              darkColor="#9ca3af"
              lightColor="#4b5563"
            >
              {module.estimated_time}
            </MotionText>
          </motion.div>
          <div className="flex space-x-1">
            {module.difficulty_levels.map((level) => (
              <motion.span
                key={level}
                className={`px-2 py-1 text-xs rounded-full ${
                  level === "beginner"
                    ? isDarkMode
                      ? "text-green-400 bg-green-900"
                      : "text-green-600 bg-green-100"
                    : level === "intermediate"
                    ? isDarkMode
                      ? "text-yellow-400 bg-yellow-900"
                      : "text-yellow-600 bg-yellow-100"
                    : isDarkMode
                    ? "text-red-400 bg-red-900"
                    : "text-red-600 bg-red-100"
                }`}
                animate={{
                  color:
                    level === "beginner"
                      ? isDarkMode
                        ? "#4ade80"
                        : "#16a34a"
                      : level === "intermediate"
                      ? isDarkMode
                        ? "#fbbf24"
                        : "#d97706"
                      : isDarkMode
                      ? "#f87171"
                      : "#dc2626",
                  backgroundColor:
                    level === "beginner"
                      ? isDarkMode
                        ? "#14532d"
                        : "#dcfce7"
                      : level === "intermediate"
                      ? isDarkMode
                        ? "#78350f"
                        : "#fef3c7"
                      : isDarkMode
                      ? "#7f1d1d"
                      : "#fee2e2",
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut",
                }}
              >
                {level}
              </motion.span>
            ))}
          </div>
        </div>
      </div>
    </MotionCard>
  );
};

export default ModuleCard;
