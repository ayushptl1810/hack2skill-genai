import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import MotionText from "./MotionText";
import MotionCard from "./MotionCard";
import SectionHeader from "./SectionHeader";

const ContentSection = ({
  section,
  index,
  isExpanded,
  onToggle,
  isDarkMode,
}) => {
  return (
    <MotionCard
      className="rounded-xl border"
      isDarkMode={isDarkMode}
      darkBackgroundColor="#1f2937"
      lightBackgroundColor="#ffffff"
      darkBorderColor="#374151"
      lightBorderColor="#e5e7eb"
      initial={{
        opacity: 0,
        y: 20,
        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
      }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
      }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
    >
      <div className="p-6">
        <SectionHeader
          title={section.title}
          isExpanded={isExpanded}
          onToggle={onToggle}
          isDarkMode={isDarkMode}
        />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
              className="mt-6 space-y-4"
            >
              <MotionText
                className="text-base"
                isDarkMode={isDarkMode}
                darkColor="#d1d5db"
                lightColor="#374151"
              >
                {section.content}
              </MotionText>

              {section.key_points && (
                <div>
                  <MotionText
                    className="text-lg font-medium mb-3"
                    isDarkMode={isDarkMode}
                    darkColor="#ffffff"
                    lightColor="#111827"
                  >
                    Key Points
                  </MotionText>
                  <ul className="space-y-2">
                    {section.key_points.map((point, pointIndex) => (
                      <li
                        key={pointIndex}
                        className="flex items-start space-x-3"
                      >
                        <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <MotionText
                          className="text-sm"
                          isDarkMode={isDarkMode}
                          darkColor="#d1d5db"
                          lightColor="#374151"
                        >
                          {point}
                        </MotionText>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {section.visual_indicators && (
                <div>
                  <MotionText
                    className="text-lg font-medium mb-3"
                    isDarkMode={isDarkMode}
                    darkColor="#ffffff"
                    lightColor="#111827"
                  >
                    Visual Indicators
                  </MotionText>
                  <div className="flex flex-wrap gap-2">
                    {section.visual_indicators.map(
                      (indicator, indicatorIndex) => (
                        <motion.span
                          key={indicatorIndex}
                          className="px-3 py-1 rounded-full text-sm"
                          animate={{
                            backgroundColor: isDarkMode ? "#78350f" : "#fef3c7",
                            color: isDarkMode ? "#fde68a" : "#92400e",
                          }}
                          transition={{ duration: 0.6, ease: "easeInOut" }}
                        >
                          {indicator}
                        </motion.span>
                      )
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </MotionCard>
  );
};

export default ContentSection;
