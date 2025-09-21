import { motion } from "framer-motion";
import ProgressCard from "../ui/ProgressCard";
import BadgeCard from "../ui/BadgeCard";
import MotionText from "../ui/MotionText";
import MotionCard from "../ui/MotionCard";
import { Trophy, CheckCircle, TrendingUp } from "lucide-react";

const ProgressOverview = ({ userProgress, modules, isDarkMode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="max-w-4xl mx-auto space-y-8"
    >
      {/* Progress Overview */}
      <MotionCard
        className={`p-8 rounded-xl ${
          isDarkMode ? "bg-gray-800" : "bg-white"
        } border border-gray-200 dark:border-gray-700`}
        isDarkMode={isDarkMode}
        darkBackgroundColor="#1f2937"
        lightBackgroundColor="#ffffff"
        darkBorderColor="#374151"
        lightBorderColor="#e5e7eb"
      >
        <MotionText
          className="text-2xl font-bold mb-6"
          isDarkMode={isDarkMode}
          darkColor="#ffffff"
          lightColor="#111827"
        >
          Your Learning Journey
        </MotionText>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProgressCard
            label="Points Earned"
            value={userProgress.points}
            icon={Trophy}
            isDarkMode={isDarkMode}
            colorScheme="blue"
          />
          <ProgressCard
            label="Modules Completed"
            value={`${userProgress.completedModules.length}/${modules.length}`}
            icon={CheckCircle}
            isDarkMode={isDarkMode}
            colorScheme="green"
          />
          <ProgressCard
            label="Learning Streak"
            value={`${userProgress.streak} days`}
            icon={TrendingUp}
            isDarkMode={isDarkMode}
            colorScheme="purple"
          />
        </div>
      </MotionCard>

      {/* Badges */}
      {userProgress.badges.length > 0 && (
        <MotionCard
          className={`p-8 rounded-xl ${
            isDarkMode ? "bg-gray-800" : "bg-white"
          } border border-gray-200 dark:border-gray-700`}
          isDarkMode={isDarkMode}
          darkBackgroundColor="#1f2937"
          lightBackgroundColor="#ffffff"
          darkBorderColor="#374151"
          lightBorderColor="#e5e7eb"
        >
          <MotionText
            className="text-xl font-semibold mb-6"
            isDarkMode={isDarkMode}
            darkColor="#ffffff"
            lightColor="#111827"
          >
            Your Badges
          </MotionText>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {userProgress.badges.map((badge, index) => (
              <BadgeCard key={index} badge={badge} isDarkMode={isDarkMode} />
            ))}
          </div>
        </MotionCard>
      )}
    </motion.div>
  );
};

export default ProgressOverview;
