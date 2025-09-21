import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Shield,
  AlertTriangle,
  CheckCircle,
  Play,
  Trophy,
  Clock,
  ChevronRight,
  ChevronDown,
  Lightbulb,
  Target,
  Users,
  ExternalLink,
} from "lucide-react";

const EducationalSidebar = ({ isDarkMode, verificationResult }) => {
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [moduleContent, setModuleContent] = useState(null);
  const [userProgress, setUserProgress] = useState({
    level: "beginner",
    completedModules: [],
    points: 0,
    streak: 0,
  });
  const [expandedSections, setExpandedSections] = useState({});
  const [contextualLearning, setContextualLearning] = useState(null);

  // Load modules on component mount
  useEffect(() => {
    loadModules();
  }, []);

  // Load contextual learning when verification result changes
  useEffect(() => {
    if (verificationResult) {
      loadContextualLearning(verificationResult);
    }
  }, [verificationResult]);

  const loadModules = async () => {
    try {
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
    }
  };

  const loadModuleContent = async (moduleId, difficultyLevel = "beginner") => {
    try {
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
    }
  };

  const loadContextualLearning = async (result) => {
    try {
      console.log("Loading contextual learning...");
      const response = await fetch(
        "http://127.0.0.1:8000/educational/contextual-learning",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const content = await response.json();
      console.log("Contextual learning loaded:", content);
      setContextualLearning(content);
    } catch (error) {
      console.error("Failed to load contextual learning:", error);
      // Set fallback contextual learning
      setContextualLearning({
        learning_summary: "Learn to verify information systematically",
        red_flags_found: [],
        verification_techniques: ["Source checking", "Cross-referencing"],
        future_tips: ["Always verify before sharing"],
        key_lessons: ["Critical thinking is essential"],
        related_topics: ["Source credibility", "Fact-checking basics"],
      });
    }
  };

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const completeModule = (moduleId) => {
    setUserProgress((prev) => ({
      ...prev,
      completedModules: [...prev.completedModules, moduleId],
      points: prev.points + 10,
    }));
  };

  return (
    <motion.div
      className={`border-l p-6 ${
        isDarkMode ? "border-gray-700" : "border-gray-200"
      }`}
      style={{ width: "30%" }}
      animate={{
        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
      }}
      transition={{
        duration: 0.6,
        ease: "easeInOut",
      }}
    >
      <div className="space-y-6">
        {/* User Progress */}
        <div>
          <motion.h3
            className="text-lg font-semibold mb-4 flex items-center"
            animate={{
              color: isDarkMode ? "#ffffff" : "#111827",
            }}
            transition={{
              duration: 0.6,
              ease: "easeInOut",
            }}
          >
            <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
            Your Progress
          </motion.h3>
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
                Level
              </span>
              <span
                className={`text-lg font-bold ${
                  isDarkMode ? "text-blue-400" : "text-blue-600"
                }`}
              >
                {userProgress.level}
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
        </div>

        {/* Learning Modules */}
        <div>
          <motion.h3
            className="text-lg font-semibold mb-4 flex items-center"
            animate={{
              color: isDarkMode ? "#ffffff" : "#111827",
            }}
            transition={{
              duration: 0.6,
              ease: "easeInOut",
            }}
          >
            <BookOpen className="w-5 h-5 text-blue-500 mr-2" />
            Learn About Misinformation
          </motion.h3>

          {/* Link to full educational page */}
          <Link
            to="/learn"
            className={`w-full mb-4 p-3 rounded-lg transition-colors flex items-center justify-between ${
              isDarkMode
                ? "bg-blue-900 text-blue-200 hover:bg-blue-800"
                : "bg-blue-50 text-blue-700 hover:bg-blue-100"
            }`}
          >
            <div className="flex items-center space-x-2">
              <ExternalLink className="w-4 h-4" />
              <span className="text-sm font-medium">
                Full Learning Experience
              </span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </Link>

          <div className="space-y-2">
            {modules.map((module) => (
              <motion.button
                key={module.id}
                onClick={() => loadModuleContent(module.id, userProgress.level)}
                className={`w-full p-3 rounded-lg transition-colors flex items-center justify-between ${
                  isDarkMode
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-50 hover:bg-gray-100 text-gray-900"
                } ${
                  userProgress.completedModules.includes(module.id)
                    ? "border-l-4 border-green-500"
                    : ""
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-2">
                  {module.id === "red_flags" && (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {module.id === "source_credibility" && (
                    <Shield className="w-4 h-4" />
                  )}
                  {module.id === "manipulation_techniques" && (
                    <Target className="w-4 h-4" />
                  )}
                  <span className="text-sm font-medium">{module.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3" />
                  <span className="text-xs">{module.estimated_time}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Contextual Learning from Verification */}
        {contextualLearning && (
          <div>
            <motion.h3
              className="text-lg font-semibold mb-4 flex items-center"
              animate={{
                color: isDarkMode ? "#ffffff" : "#111827",
              }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
              }}
            >
              <Lightbulb className="w-5 h-5 text-purple-500 mr-2" />
              Learning from This Check
            </motion.h3>
            <div
              className={`p-4 rounded-lg ${
                isDarkMode ? "bg-purple-900" : "bg-purple-50"
              }`}
            >
              <motion.p
                className={`text-sm mb-3 ${
                  isDarkMode ? "text-purple-200" : "text-purple-800"
                }`}
                animate={{
                  color: isDarkMode ? "#e9d5ff" : "#6b21a8",
                }}
              >
                {contextualLearning.learning_summary}
              </motion.p>

              {contextualLearning.red_flags_found &&
                contextualLearning.red_flags_found.length > 0 && (
                  <div className="mb-3">
                    <h4
                      className={`text-sm font-medium mb-2 ${
                        isDarkMode ? "text-purple-200" : "text-purple-800"
                      }`}
                    >
                      Red Flags Found:
                    </h4>
                    <ul className="text-xs space-y-1">
                      {contextualLearning.red_flags_found.map((flag, index) => (
                        <li key={index} className="flex items-center">
                          <AlertTriangle className="w-3 h-3 mr-1 text-red-500" />
                          {flag}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {contextualLearning.future_tips &&
                contextualLearning.future_tips.length > 0 && (
                  <div>
                    <h4
                      className={`text-sm font-medium mb-2 ${
                        isDarkMode ? "text-purple-200" : "text-purple-800"
                      }`}
                    >
                      Tips for Next Time:
                    </h4>
                    <ul className="text-xs space-y-1">
                      {contextualLearning.future_tips.map((tip, index) => (
                        <li key={index} className="flex items-center">
                          <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Module Content Display */}
        {moduleContent && (
          <div>
            <motion.h3
              className="text-lg font-semibold mb-4"
              animate={{
                color: isDarkMode ? "#ffffff" : "#111827",
              }}
            >
              {moduleContent.title}
            </motion.h3>

            <div
              className={`p-4 rounded-lg ${
                isDarkMode ? "bg-gray-800" : "bg-gray-50"
              }`}
            >
              <motion.p
                className={`text-sm mb-4 ${
                  isDarkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                {moduleContent.overview}
              </motion.p>

              <div className="mb-4">
                <h4
                  className={`text-sm font-medium mb-2 ${
                    isDarkMode ? "text-white" : "text-gray-900"
                  }`}
                >
                  Learning Objectives:
                </h4>
                <ul className="text-xs space-y-1">
                  {moduleContent.learning_objectives?.map(
                    (objective, index) => (
                      <li key={index} className="flex items-start">
                        <Target className="w-3 h-3 mr-1 mt-0.5 text-blue-500 flex-shrink-0" />
                        {objective}
                      </li>
                    )
                  )}
                </ul>
              </div>

              {moduleContent.content_sections?.map((section, index) => (
                <div key={index} className="mb-4">
                  <button
                    onClick={() => toggleSection(`section-${index}`)}
                    className={`w-full flex items-center justify-between p-2 rounded ${
                      isDarkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
                    }`}
                  >
                    <h5
                      className={`text-sm font-medium ${
                        isDarkMode ? "text-white" : "text-gray-900"
                      }`}
                    >
                      {section.title}
                    </h5>
                    {expandedSections[`section-${index}`] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>

                  <AnimatePresence>
                    {expandedSections[`section-${index}`] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 pl-4"
                      >
                        <p
                          className={`text-xs mb-2 ${
                            isDarkMode ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {section.content}
                        </p>

                        {section.key_points && (
                          <div className="mb-2">
                            <h6
                              className={`text-xs font-medium mb-1 ${
                                isDarkMode ? "text-white" : "text-gray-900"
                              }`}
                            >
                              Key Points:
                            </h6>
                            <ul className="text-xs space-y-1">
                              {section.key_points.map((point, pointIndex) => (
                                <li
                                  key={pointIndex}
                                  className="flex items-start"
                                >
                                  <CheckCircle className="w-3 h-3 mr-1 mt-0.5 text-green-500 flex-shrink-0" />
                                  {point}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              <motion.button
                onClick={() => completeModule(selectedModule)}
                className={`w-full p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "bg-green-900 text-green-200 hover:bg-green-800"
                    : "bg-green-50 text-green-700 hover:bg-green-100"
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Mark as Complete</span>
                </div>
              </motion.button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default EducationalSidebar;
