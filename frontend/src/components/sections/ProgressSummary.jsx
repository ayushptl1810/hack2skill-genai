import { motion } from "framer-motion";
import ProgressCard from "../ui/ProgressCard";
import { Trophy, CheckCircle, TrendingUp } from "lucide-react";

const ProgressSummary = ({ userProgress, isDarkMode }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="p-4 border-t border-gray-200 dark:border-gray-700"
    >
      <div className="space-y-3">
        <ProgressCard
          label="Points"
          value={userProgress.points}
          icon={Trophy}
          isDarkMode={isDarkMode}
          colorScheme="yellow"
        />
        <ProgressCard
          label="Completed"
          value={userProgress.completedModules.length}
          icon={CheckCircle}
          isDarkMode={isDarkMode}
          colorScheme="blue"
        />
        <ProgressCard
          label="Streak"
          value={`${userProgress.streak} days`}
          icon={TrendingUp}
          isDarkMode={isDarkMode}
          colorScheme="green"
        />
      </div>
    </motion.div>
  );
};

export default ProgressSummary;
