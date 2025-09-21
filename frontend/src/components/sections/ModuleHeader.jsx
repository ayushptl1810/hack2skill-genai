import { motion } from "framer-motion";
import { CheckCircle, Trophy, Target } from "lucide-react";
import MotionText from "../ui/MotionText";
import MotionCard from "../ui/MotionCard";
import MotionButton from "../ui/MotionButton";

const ModuleHeader = ({
  moduleContent,
  selectedModule,
  userProgress,
  isDarkMode,
  onCompleteModule,
}) => {
  const isCompleted = userProgress.completedModules.includes(selectedModule);

  return (
    <MotionCard
      className={`p-8 rounded-xl mb-8 border`}
      isDarkMode={isDarkMode}
      darkBackgroundColor="#1f2937"
      lightBackgroundColor="#ffffff"
      darkBorderColor="#374151"
      lightBorderColor="#e5e7eb"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <MotionText
            className="text-3xl font-bold mb-2"
            isDarkMode={isDarkMode}
            darkColor="#ffffff"
            lightColor="#111827"
          >
            {moduleContent.title}
          </MotionText>
          <MotionText
            className="text-lg"
            isDarkMode={isDarkMode}
            darkColor="#d1d5db"
            lightColor="#4b5563"
          >
            {moduleContent.overview}
          </MotionText>
        </div>
        <MotionButton
          onClick={
            isCompleted ? undefined : () => onCompleteModule(selectedModule)
          }
          disabled={isCompleted}
          className={`px-6 py-3 rounded-lg font-medium ${
            isCompleted
              ? "bg-green-500 text-white cursor-not-allowed"
              : "cursor-pointer hover:shadow-lg"
          } ${
            !isCompleted && isDarkMode
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : !isCompleted
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : ""
          }`}
          isDarkMode={isDarkMode}
          darkBackgroundColor={isCompleted ? "#10b981" : "#2563eb"}
          lightBackgroundColor={isCompleted ? "#10b981" : "#3b82f6"}
          darkColor="#ffffff"
          lightColor="#ffffff"
        >
          {isCompleted ? (
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-10 h-10" />
              <span>Completed</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Trophy className="w-10 h-10" />
              <span>Mark Complete</span>
            </div>
          )}
        </MotionButton>
      </div>

      {/* Learning Objectives */}
      <div className="mb-6">
        <MotionText
          className="text-lg font-semibold mb-3"
          isDarkMode={isDarkMode}
          darkColor="#ffffff"
          lightColor="#111827"
        >
          Learning Objectives
        </MotionText>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {moduleContent.learning_objectives?.map((objective, index) => (
            <div key={index} className="flex items-start space-x-3">
              <Target className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
              <MotionText
                className="text-sm"
                isDarkMode={isDarkMode}
                darkColor="#d1d5db"
                lightColor="#374151"
              >
                {objective}
              </MotionText>
            </div>
          ))}
        </div>
      </div>
    </MotionCard>
  );
};

export default ModuleHeader;
