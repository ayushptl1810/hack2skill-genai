import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageCircle, BookOpen, Home } from "lucide-react";

const Navigation = ({ isDarkMode }) => {
  const location = useLocation();

  const navItems = [
    {
      path: "/",
      label: "Fact Check",
      icon: MessageCircle,
      description: "Verify claims and content",
    },
    {
      path: "/learn",
      label: "Learn",
      icon: BookOpen,
      description: "Educational modules",
    },
  ];

  return (
    <motion.nav
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${
        isDarkMode ? "bg-gray-800" : "bg-white"
      } rounded-full shadow-lg border ${
        isDarkMode ? "border-gray-700" : "border-gray-200"
      } px-6 py-3 backdrop-blur-sm bg-opacity-95`}
      animate={{
        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
      }}
      transition={{
        duration: 0.6,
        ease: "easeInOut",
      }}
    >
      <div className="flex items-center space-x-6">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-600 ${
                isActive
                  ? isDarkMode
                    ? "bg-blue-600 text-white"
                    : "bg-blue-500 text-white"
                  : isDarkMode
                  ? "text-gray-300 hover:text-white hover:bg-gray-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
};

export default Navigation;
