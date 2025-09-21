import { motion } from "framer-motion";
import ContentSection from "../ui/ContentSection";

const ContentSections = ({
  contentSections,
  expandedSections,
  onToggleSection,
  isDarkMode,
}) => {
  return (
    <div className="space-y-6">
      {contentSections?.map((section, index) => (
        <ContentSection
          key={index}
          section={section}
          index={index}
          isExpanded={expandedSections[`section-${index}`]}
          onToggle={() => onToggleSection(`section-${index}`)}
          isDarkMode={isDarkMode}
        />
      ))}
    </div>
  );
};

export default ContentSections;
