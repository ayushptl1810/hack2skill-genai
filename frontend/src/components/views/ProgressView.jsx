import { motion } from "framer-motion";
import ProgressOverview from "../sections/ProgressOverview";

const ProgressView = ({ userProgress, modules, isDarkMode }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="max-w-4xl mx-auto px-4 sm:px-6"
    >
      <ProgressOverview
        userProgress={userProgress}
        modules={modules}
        isDarkMode={isDarkMode}
      />
    </motion.div>
  );
};

export default ProgressView;
