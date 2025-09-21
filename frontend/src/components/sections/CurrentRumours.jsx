import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import RumourCard from "../ui/RumourCard";
import RumourModal from "../ui/RumourModal";
import MotionText from "../ui/MotionText";
import mockRumoursData from "../../data/mockRumours.json";

const CurrentRumours = ({ isDarkMode }) => {
  const [rumours, setRumours] = useState([]);
  const [selectedRumour, setSelectedRumour] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Load mock data (in future this will be an API call)
    setRumours(mockRumoursData.posts);
  }, []);

  const handleRumourClick = (rumour) => {
    setSelectedRumour(rumour);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRumour(null);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
        className={`p-4 border-t ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
      >
        {/* Section Header */}
        <div className="flex items-center space-x-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-orange-500" />
          <MotionText
            className="text-lg font-semibold"
            isDarkMode={isDarkMode}
            darkColor="#ffffff"
            lightColor="#111827"
          >
            Current Rumours
          </MotionText>
        </div>

        {/* Scrollable Rumours List */}
        <div className="max-h-135 overflow-y-auto space-y-3 pr-1">
          {rumours.length > 0 ? (
            rumours.map((rumour, index) => (
              <RumourCard
                key={index}
                post={rumour}
                isDarkMode={isDarkMode}
                onClick={() => handleRumourClick(rumour)}
              />
            ))
          ) : (
            <motion.div
              className={`text-center py-8 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <MotionText
                className="text-sm"
                isDarkMode={isDarkMode}
                darkColor="#9ca3af"
                lightColor="#6b7280"
              >
                No rumours to display
              </MotionText>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Modal */}
      <RumourModal
        post={selectedRumour}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        isDarkMode={isDarkMode}
      />
    </>
  );
};

export default CurrentRumours;
