import { motion } from "framer-motion";
import ModuleHeader from "../sections/ModuleHeader";
import ContentSections from "../sections/ContentSections";
import PracticalTips from "../ui/PracticalTips";

const ContentView = ({
  moduleContent,
  selectedModule,
  userProgress,
  expandedSections,
  isDarkMode,
  onToggleSection,
  onCompleteModule,
}) => {
  if (!moduleContent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">No module content available</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="max-w-4xl mx-auto px-4 sm:px-6"
    >
      <ModuleHeader
        moduleContent={moduleContent}
        selectedModule={selectedModule}
        userProgress={userProgress}
        isDarkMode={isDarkMode}
        onCompleteModule={onCompleteModule}
      />

      <ContentSections
        contentSections={moduleContent.content_sections}
        expandedSections={expandedSections}
        onToggleSection={onToggleSection}
        isDarkMode={isDarkMode}
      />

      <PracticalTips
        tips={moduleContent.practical_tips}
        isDarkMode={isDarkMode}
      />
    </motion.div>
  );
};

export default ContentView;
