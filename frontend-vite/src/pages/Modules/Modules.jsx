import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Filter, BookOpen, AlertTriangle, Shield, Target } from "lucide-react";
import ModulesGrid from "../../components/ModulesGrid";
import ModuleCard from "../../components/ModuleCard";
import { getApiBaseUrl } from "../../services/api";

const Modules = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [userProgress, setUserProgress] = useState({
    level: "beginner",
    completedModules: [],
    points: 0,
  });

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/educational/modules`);
      if (response.ok) {
        const data = await response.json();
        setModules(data.modules || []);
      } else {
        // Fallback modules
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
    } catch (error) {
      console.error("Failed to load modules:", error);
    } finally {
      setLoading(false);
    }
  };

  const getModuleIcon = (moduleId) => {
    switch (moduleId) {
      case "red_flags":
        return AlertTriangle;
      case "source_credibility":
        return Shield;
      case "manipulation_techniques":
        return Target;
      default:
        return BookOpen;
    }
  };

  const handleModuleClick = (moduleId) => {
    navigate(`/modules/${moduleId}`);
  };

  const filteredModules = modules.filter((module) => {
    const matchesSearch = module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" ||
      module.difficulty_levels.includes(difficultyFilter);
    return matchesSearch && matchesDifficulty;
  });

  if (id) {
    // Module detail page (placeholder)
    return (
      <div className="min-h-screen bg-black py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate("/modules")}
            className="mb-6 text-blue-400 hover:text-blue-300"
          >
            ← Back to Modules
          </button>
          <div className="bg-black rounded-xl p-8 border border-gray-900">
            <h1 className="text-3xl font-bold text-white mb-4">Module Details</h1>
            <p className="text-gray-400">Module ID: {id}</p>
            <p className="text-gray-400 mt-4">
              Detailed module content will be displayed here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Educational Modules</h1>
          <p className="text-gray-400">Learn how to identify and combat misinformation</p>
        </motion.div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black text-white rounded-lg border border-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Difficulty Filter */}
            <select
              value={difficultyFilter}
              onChange={(e) => setDifficultyFilter(e.target.value)}
              className="px-4 py-2 bg-black text-white rounded-lg border border-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
        </div>

        {/* Modules Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="text-gray-400 mt-4">Loading modules...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <ModuleCard
                  module={module}
                  isDarkMode={true}
                  isCompleted={userProgress.completedModules.includes(module.id)}
                  onClick={() => handleModuleClick(module.id)}
                  getModuleIcon={getModuleIcon}
                />
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filteredModules.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">No modules found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Modules;

