import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Shield,
  AlertTriangle,
  CheckCircle,
  Trophy,
  Clock,
  ChevronRight,
  ChevronDown,
  Lightbulb,
  Target,
  ArrowLeft,
  Brain,
  Menu,
  X,
  TrendingUp,
  Sun,
  Moon,
} from "lucide-react";

const EducationalPage = ({ isDarkMode, setIsDarkMode }) => {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleContent, setModuleContent] = useState(null);
  const [userProgress, setUserProgress] = useState({
    level: "beginner",
    completedModules: [],
    points: 0,
    streak: 0,
    totalTimeSpent: 0,
    badges: [],
  });
  const [expandedSections, setExpandedSections] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState("modules"); // modules, content, progress
  const [loading, setLoading] = useState(false);

  // Load modules on component mount
  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      console.log("Loading educational modules...");
      const response = await fetch("http://127.0.0.1:8000/educational/modules");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("Modules loaded:", data);
      setModules(data.modules || []);
    } catch (error) {
      console.error("Failed to load modules:", error);
      // Set fallback modules if API fails
      setModules([
        {
          id: "red_flags",
          title: "How to Spot Red Flags",
          description: "Learn to identify warning signs in misinformation",
          difficulty_levels: ["beginner", "intermediate", "advanced"],
          estimated_time: "10-15 minutes",
        },
        {
          id: "source_credibility",
          title: "Evaluating Source Credibility",
          description: "Understand how to assess source reliability",
          difficulty_levels: ["beginner", "intermediate", "advanced"],
          estimated_time: "15-20 minutes",
        },
        {
          id: "manipulation_techniques",
          title: "Common Manipulation Techniques",
          description: "Learn about various misinformation techniques",
          difficulty_levels: ["intermediate", "advanced"],
          estimated_time: "20-25 minutes",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadModuleContent = async (moduleId, difficultyLevel = "beginner") => {
    try {
      setLoading(true);
      console.log(`Loading content for ${moduleId} (${difficultyLevel})...`);
      const response = await fetch(
        `http://127.0.0.1:8000/educational/modules/${moduleId}?difficulty_level=${difficultyLevel}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const content = await response.json();
      console.log("Module content loaded:", content);
      setModuleContent(content);
      setSelectedModule(moduleId);
      setCurrentView("content");
    } catch (error) {
      console.error("Failed to load module content:", error);
      // Set fallback content
      setModuleContent({
        title: `Educational Module: ${moduleId}`,
        overview: "Learn about misinformation detection",
        learning_objectives: ["Understand basic concepts"],
        content_sections: [],
        practical_tips: [],
        common_mistakes: [],
        difficulty_level: difficultyLevel,
      });
      setSelectedModule(moduleId);
      setCurrentView("content");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const completeModule = (moduleId) => {
    if (!userProgress.completedModules.includes(moduleId)) {
      setUserProgress((prev) => ({
        ...prev,
        completedModules: [...prev.completedModules, moduleId],
        points: prev.points + 50,
        badges: [
          ...prev.badges,
          { id: moduleId, name: "Module Master", icon: "🎓" },
        ],
      }));
    }
  };

  const getModuleIcon = (moduleId) => {
    switch (moduleId) {
      case "red_flags":
        return <AlertTriangle className="w-6 h-6" />;
      case "source_credibility":
        return <Shield className="w-6 h-6" />;
      case "manipulation_techniques":
        return <Target className="w-6 h-6" />;
      default:
        return <BookOpen className="w-6 h-6" />;
    }
  };

  const getDifficultyColor = (level) => {
    switch (level) {
      case "beginner":
        return "text-green-600 bg-green-100";
      case "intermediate":
        return "text-yellow-600 bg-yellow-100";
      case "advanced":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  return (
    <motion.div
      className={`min-h-screen flex ${
        isDarkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
      animate={{
        backgroundColor: isDarkMode ? "#111827" : "#f9fafb",
      }}
      transition={{
        duration: 0.6,
        ease: "easeInOut",
      }}
    >
      {/* Sidebar */}
      <motion.div
        className={`${
          sidebarOpen ? "w-80" : "w-16"
        } transition-all duration-300 ${
          isDarkMode
            ? "bg-gray-800 border-gray-700"
            : "bg-white border-gray-200"
        } border-r flex flex-col`}
        animate={{
          backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
        }}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center space-x-3"
              >
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1
                    className={`text-xl font-bold ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Learn
                  </h1>
                  <p
                    className={`text-sm ${
                      isDarkMode ? "text-gray-400" : "text-gray-600"
                    }`}
                  >
                    Misinformation Detection
                  </p>
                </div>
              </motion.div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-lg ${
                isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              {sidebarOpen ? (
                <X className="w-5 h-5 text-blue-500" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 space-y-2"
          >
            <button
              onClick={() => setCurrentView("modules")}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                currentView === "modules"
                  ? isDarkMode
                    ? "bg-blue-900 text-blue-200"
                    : "bg-blue-100 text-blue-800"
                  : isDarkMode
                  ? "hover:bg-gray-700 text-gray-300"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <BookOpen className="w-5 h-5" />
              <span>Modules</span>
            </button>
            <button
              onClick={() => setCurrentView("progress")}
              className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                currentView === "progress"
                  ? isDarkMode
                    ? "bg-green-900 text-green-200"
                    : "bg-green-100 text-green-800"
                  : isDarkMode
                  ? "hover:bg-gray-700 text-gray-300"
                  : "hover:bg-gray-100 text-gray-700"
              }`}
            >
              <Trophy className="w-5 h-5" />
              <span>Progress</span>
            </button>
          </motion.div>
        )}

        {/* User Progress Summary */}
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="space-y-3">
              <div
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isDarkMode ? "bg-yellow-900" : "bg-yellow-50"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-yellow-200" : "text-yellow-800"
                  }`}
                >
                  Points
                </span>
                <span
                  className={`text-lg font-bold ${
                    isDarkMode ? "text-yellow-400" : "text-yellow-600"
                  }`}
                >
                  {userProgress.points}
                </span>
              </div>
              <div
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isDarkMode ? "bg-blue-900" : "bg-blue-50"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-blue-200" : "text-blue-800"
                  }`}
                >
                  Completed
                </span>
                <span
                  className={`text-lg font-bold ${
                    isDarkMode ? "text-blue-400" : "text-blue-600"
                  }`}
                >
                  {userProgress.completedModules.length}
                </span>
              </div>
              <div
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isDarkMode ? "bg-green-900" : "bg-green-50"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    isDarkMode ? "text-green-200" : "text-green-800"
                  }`}
                >
                  Streak
                </span>
                <span
                  className={`text-lg font-bold ${
                    isDarkMode ? "text-green-400" : "text-green-600"
                  }`}
                >
                  {userProgress.streak} days
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div
          className={`p-6 border-b ${
            isDarkMode ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className={`p-2 rounded-lg ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                <ArrowLeft className="w-5 h-5 text-blue-500" />
              </button>
              <div>
                <h1
                  className={`text-2xl font-bold ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  {currentView === "modules" && "Educational Modules"}
                  {currentView === "content" && moduleContent?.title}
                  {currentView === "progress" && "Your Progress"}
                </h1>
                <p
                  className={`text-sm ${
                    isDarkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  {currentView === "modules" &&
                    "Learn to detect and combat misinformation"}
                  {currentView === "content" &&
                    "Interactive learning experience"}
                  {currentView === "progress" && "Track your learning journey"}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg ${
                  isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                }`}
              >
                {isDarkMode ? (
                  <Sun className="w-5 h-5" />
                ) : (
                  <Moon className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
                <div
                  className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          )}

          {currentView === "modules" && !loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map((module) => (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                    isDarkMode
                      ? "bg-gray-800 border-gray-700 hover:border-blue-500"
                      : "bg-white border-gray-200 hover:border-blue-500"
                  } ${
                    userProgress.completedModules.includes(module.id)
                      ? "ring-2 ring-green-500 border-green-500"
                      : ""
                  }`}
                  onClick={() =>
                    loadModuleContent(module.id, userProgress.level)
                  }
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={`p-3 rounded-lg ${
                        isDarkMode ? "bg-blue-900" : "bg-blue-100"
                      }`}
                    >
                      {getModuleIcon(module.id)}
                    </div>
                    {userProgress.completedModules.includes(module.id) && (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    )}
                  </div>

                  <h3
                    className={`text-xl font-bold mb-2 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    {module.title}
                  </h3>

                  <p
                    className={`text-sm mb-4 ${
                      isDarkMode ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {module.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span
                        className={`text-sm ${
                          isDarkMode ? "text-gray-400" : "text-gray-600"
                        }`}
                      >
                        {module.estimated_time}
                      </span>
                    </div>
                    <div className="flex space-x-1">
                      {module.difficulty_levels.map((level) => (
                        <span
                          key={level}
                          className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(
                            level
                          )}`}
                        >
                          {level}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {currentView === "content" && moduleContent && !loading && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="max-w-4xl mx-auto"
            >
              {/* Module Header */}
              <div
                className={`p-8 rounded-xl mb-8 ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } border border-gray-200 dark:border-gray-700`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h1
                      className={`text-3xl font-bold mb-2 ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {moduleContent.title}
                    </h1>
                    <p
                      className={`text-lg ${
                        isDarkMode ? "text-gray-300" : "text-gray-600"
                      }`}
                    >
                      {moduleContent.overview}
                    </p>
                  </div>
                  <button
                    onClick={() => completeModule(selectedModule)}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      userProgress.completedModules.includes(selectedModule)
                        ? "bg-green-500 text-white"
                        : isDarkMode
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {userProgress.completedModules.includes(selectedModule) ? (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>Completed</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Trophy className="w-5 h-5" />
                        <span>Mark Complete</span>
                      </div>
                    )}
                  </button>
                </div>

                {/* Learning Objectives */}
                <div className="mb-6">
                  <h3
                    className={`text-lg font-semibold mb-3 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Learning Objectives
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {moduleContent.learning_objectives?.map(
                      (objective, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <Target className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" />
                          <span
                            className={`text-sm ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {objective}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Content Sections */}
              <div className="space-y-6">
                {moduleContent.content_sections?.map((section, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-6 rounded-xl ${
                      isDarkMode ? "bg-gray-800" : "bg-white"
                    } border border-gray-200 dark:border-gray-700`}
                  >
                    <button
                      onClick={() => toggleSection(`section-${index}`)}
                      className="w-full flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <h3
                        className={`text-xl font-semibold ${
                          isDarkMode ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {section.title}
                      </h3>
                      {expandedSections[`section-${index}`] ? (
                        <ChevronDown className="w-6 h-6 text-gray-500" />
                      ) : (
                        <ChevronRight className="w-6 h-6 text-gray-500" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedSections[`section-${index}`] && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 space-y-4"
                        >
                          <p
                            className={`text-base ${
                              isDarkMode ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {section.content}
                          </p>

                          {section.key_points && (
                            <div>
                              <h4
                                className={`text-lg font-medium mb-3 ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                Key Points
                              </h4>
                              <ul className="space-y-2">
                                {section.key_points.map((point, pointIndex) => (
                                  <li
                                    key={pointIndex}
                                    className="flex items-start space-x-3"
                                  >
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span
                                      className={`text-sm ${
                                        isDarkMode
                                          ? "text-gray-300"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {point}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {section.visual_indicators && (
                            <div>
                              <h4
                                className={`text-lg font-medium mb-3 ${
                                  isDarkMode ? "text-white" : "text-gray-900"
                                }`}
                              >
                                Visual Indicators
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {section.visual_indicators.map(
                                  (indicator, indicatorIndex) => (
                                    <span
                                      key={indicatorIndex}
                                      className={`px-3 py-1 rounded-full text-sm ${
                                        isDarkMode
                                          ? "bg-yellow-900 text-yellow-200"
                                          : "bg-yellow-100 text-yellow-800"
                                      }`}
                                    >
                                      {indicator}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>

              {/* Practical Tips */}
              {moduleContent.practical_tips && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className={`p-6 rounded-xl mt-8 ${
                    isDarkMode ? "bg-green-900" : "bg-green-50"
                  } border border-green-200 dark:border-green-700`}
                >
                  <h3
                    className={`text-xl font-semibold mb-4 ${
                      isDarkMode ? "text-green-200" : "text-green-800"
                    }`}
                  >
                    Practical Tips
                  </h3>
                  <div className="space-y-3">
                    {moduleContent.practical_tips.map((tip, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <Lightbulb className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span
                          className={`text-sm ${
                            isDarkMode ? "text-green-200" : "text-green-700"
                          }`}
                        >
                          {tip}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {currentView === "progress" && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              {/* Progress Overview */}
              <div
                className={`p-8 rounded-xl ${
                  isDarkMode ? "bg-gray-800" : "bg-white"
                } border border-gray-200 dark:border-gray-700`}
              >
                <h2
                  className={`text-2xl font-bold mb-6 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Your Learning Journey
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div
                    className={`p-6 rounded-lg ${
                      isDarkMode ? "bg-blue-900" : "bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <Trophy className="w-6 h-6 text-blue-500" />
                      <span
                        className={`text-lg font-semibold ${
                          isDarkMode ? "text-blue-200" : "text-blue-800"
                        }`}
                      >
                        Points Earned
                      </span>
                    </div>
                    <p
                      className={`text-3xl font-bold ${
                        isDarkMode ? "text-blue-400" : "text-blue-600"
                      }`}
                    >
                      {userProgress.points}
                    </p>
                  </div>

                  <div
                    className={`p-6 rounded-lg ${
                      isDarkMode ? "bg-green-900" : "bg-green-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                      <span
                        className={`text-lg font-semibold ${
                          isDarkMode ? "text-green-200" : "text-green-800"
                        }`}
                      >
                        Modules Completed
                      </span>
                    </div>
                    <p
                      className={`text-3xl font-bold ${
                        isDarkMode ? "text-green-400" : "text-green-600"
                      }`}
                    >
                      {userProgress.completedModules.length}/{modules.length}
                    </p>
                  </div>

                  <div
                    className={`p-6 rounded-lg ${
                      isDarkMode ? "bg-purple-900" : "bg-purple-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <TrendingUp className="w-6 h-6 text-purple-500" />
                      <span
                        className={`text-lg font-semibold ${
                          isDarkMode ? "text-purple-200" : "text-purple-800"
                        }`}
                      >
                        Learning Streak
                      </span>
                    </div>
                    <p
                      className={`text-3xl font-bold ${
                        isDarkMode ? "text-purple-400" : "text-purple-600"
                      }`}
                    >
                      {userProgress.streak} days
                    </p>
                  </div>
                </div>
              </div>

              {/* Badges */}
              {userProgress.badges.length > 0 && (
                <div
                  className={`p-8 rounded-xl ${
                    isDarkMode ? "bg-gray-800" : "bg-white"
                  } border border-gray-200 dark:border-gray-700`}
                >
                  <h3
                    className={`text-xl font-semibold mb-6 ${
                      isDarkMode ? "text-white" : "text-gray-900"
                    }`}
                  >
                    Your Badges
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {userProgress.badges.map((badge, index) => (
                      <div
                        key={index}
                        className={`p-4 rounded-lg text-center ${
                          isDarkMode ? "bg-yellow-900" : "bg-yellow-50"
                        }`}
                      >
                        <div className="text-3xl mb-2">{badge.icon}</div>
                        <p
                          className={`text-sm font-medium ${
                            isDarkMode ? "text-yellow-200" : "text-yellow-800"
                          }`}
                        >
                          {badge.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default EducationalPage;
