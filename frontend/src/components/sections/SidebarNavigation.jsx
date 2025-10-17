import { motion } from "framer-motion";
import { BookOpen, Trophy, MessageSquare } from "lucide-react";
import MotionButton from "../ui/MotionButton";

const SidebarNavigation = ({
  currentView,
  setCurrentView,
  isDarkMode,
  onFactCheckClick,
}) => {
  const navItems = [
    {
      id: "modules",
      label: "Modules",
      icon: BookOpen,
      activeBg: isDarkMode ? "#1e3a8a" : "#dbeafe",
      activeColor: isDarkMode ? "#bfdbfe" : "#1e40af",
      inactiveBg: "transparent",
      inactiveColor: isDarkMode ? "#d1d5db" : "#374151",
    },
    {
      id: "progress",
      label: "Progress",
      icon: Trophy,
      activeBg: isDarkMode ? "#14532d" : "#dcfce7",
      activeColor: isDarkMode ? "#bbf7d0" : "#166534",
      inactiveBg: "transparent",
      inactiveColor: isDarkMode ? "#d1d5db" : "#374151",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="p-4 space-y-2"
    >
      {/* Chatbot Link */}
      {(() => {
        const isActive = currentView === "chatbot";
        const activeBg = isDarkMode ? "#7f1d1d" : "#fee2e2"; // red dark/light
        const activeColor = isDarkMode ? "#fecaca" : "#b91c1c"; // red text
        const inactiveBg = "transparent";
        const inactiveColor = isDarkMode ? "#d1d5db" : "#374151";
        return (
          <MotionButton
            onClick={onFactCheckClick}
            className="w-full flex items-center space-x-3 p-3 rounded-lg"
            isDarkMode={isDarkMode}
            darkBackgroundColor={isActive ? activeBg : inactiveBg}
            lightBackgroundColor={isActive ? activeBg : inactiveBg}
            darkColor={isActive ? activeColor : inactiveColor}
            lightColor={isActive ? activeColor : inactiveColor}
          >
            <MessageSquare className="w-5 h-5" />
            <span>Fact Check</span>
          </MotionButton>
        );
      })()}

      {/* Existing Navigation Items */}
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;

        return (
          <MotionButton
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className="w-full flex items-center space-x-3 p-3 rounded-lg"
            isDarkMode={isDarkMode}
            darkBackgroundColor={isActive ? item.activeBg : item.inactiveBg}
            lightBackgroundColor={isActive ? item.activeBg : item.inactiveBg}
            darkColor={isActive ? item.activeColor : item.inactiveColor}
            lightColor={isActive ? item.activeColor : item.inactiveColor}
          >
            <Icon className="w-5 h-5" />
            <span>{item.label}</span>
          </MotionButton>
        );
      })}
    </motion.div>
  );
};

export default SidebarNavigation;
