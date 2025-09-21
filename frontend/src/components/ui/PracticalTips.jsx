import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import MotionText from "./MotionText";
import MotionCard from "./MotionCard";

const PracticalTips = ({ tips, isDarkMode }) => {
  if (!tips || tips.length === 0) return null;

  return (
    <MotionCard
      className={`p-6 rounded-xl mt-8 ${
        isDarkMode ? "bg-green-900" : "bg-green-50"
      } border border-green-200 dark:border-green-700`}
      isDarkMode={isDarkMode}
      darkBackgroundColor="#064e3b"
      lightBackgroundColor="#f0fdf4"
      darkBorderColor="#065f46"
      lightBorderColor="#bbf7d0"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.6, ease: "easeInOut" }}
    >
      <MotionText
        className="text-xl font-semibold mb-4"
        isDarkMode={isDarkMode}
        darkColor="#bbf7d0"
        lightColor="#166534"
      >
        Practical Tips
      </MotionText>
      <div className="space-y-3">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
            <MotionText
              className="text-sm"
              isDarkMode={isDarkMode}
              darkColor="#bbf7d0"
              lightColor="#15803d"
            >
              {tip}
            </MotionText>
          </div>
        ))}
      </div>
    </MotionCard>
  );
};

export default PracticalTips;
