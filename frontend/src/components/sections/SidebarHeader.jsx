import { motion } from "framer-motion";
import { X, Menu } from "lucide-react";
import MotionText from "../ui/MotionText.jsx";
import { Link } from "react-router-dom";
import logo from "../../assets/logo.png";

const SidebarHeader = ({
  title,
  subtitle,
  isDarkMode,
  sidebarOpen,
  onToggle,
}) => {
  return (
    <div
      className={`p-6 border-b ${
        isDarkMode ? "border-gray-700" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="flex items-center space-x-3"
          >
            <div className="w-16 h-16 flex items-center justify-center">
              <img
                src={logo}
                alt="Project Aegis"
                className="w-16 h-16 object-contain"
              />
            </div>
            <div>
              <MotionText
                className="text-xl font-bold"
                isDarkMode={isDarkMode}
                darkColor="#ffffff"
                lightColor="#111827"
              >
                {title}
              </MotionText>
              <MotionText
                className="text-sm"
                isDarkMode={isDarkMode}
                darkColor="#9ca3af"
                lightColor="#4b5563"
              >
                {subtitle}
              </MotionText>
            </div>
          </motion.div>
        )}
        <motion.button
          onClick={onToggle}
          className={`ml-4 rounded-lg ${
            isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
          }`}
          animate={{
            backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
          }}
          whileHover={{ backgroundColor: isDarkMode ? "#374151" : "#f3f4f6" }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {sidebarOpen ? (
            <motion.div
              animate={{ color: isDarkMode ? "#9ca3af" : "#374151" }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <X className="w-4 h-4" />
            </motion.div>
          ) : (
            <motion.div
              animate={{ color: isDarkMode ? "#9ca3af" : "#6b7280" }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            >
              <Menu className="w-4 h-4" />
            </motion.div>
          )}
        </motion.button>
      </div>
    </div>
  );
};

export default SidebarHeader;
