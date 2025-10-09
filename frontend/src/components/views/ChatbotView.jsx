import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Upload,
  Image,
  Video,
  Mic,
  CheckCircle,
  AlertCircle,
  Clock,
  Sun,
  Moon,
  X,
} from "lucide-react";

const ChatbotView = ({ isDarkMode, setIsDarkMode, onLearnClick }) => {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "ai",
      content:
        "Hello! I'm your AI fact-checking assistant. I can verify text claims, analyze images, and check videos for accuracy. What would you like me to verify?",
      timestamp: new Date(),
      sources: [],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return;

    const userMessage = {
      id: `user-${Date.now()}-${Math.random()}`,
      type: "user",
      content: inputValue,
      timestamp: new Date(),
      files: uploadedFiles,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setUploadedFiles([]);
    setIsLoading(true);

    try {
      // Create FormData to match backend expectations
      const formData = new FormData();

      // Add text input if provided
      if (inputValue.trim()) {
        formData.append("text_input", inputValue.trim());
      }

      // Add files if provided
      if (uploadedFiles.length > 0) {
        uploadedFiles.forEach((file) => {
          formData.append("files", file);
        });
      }

      const VITE_API_BASE_URL =
        import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:7860";

      const response = await fetch(`${VITE_API_BASE_URL}/chatbot/verify`, {
        method: "POST",
        body: formData, // Send FormData instead of JSON
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Verification result:", result);

      // Check if backend returned an error
      if (result.error) {
        throw new Error(result.error);
      }

      const aiMessage = {
        id: `ai-${Date.now()}-${Math.random()}`,
        type: "ai",
        content:
          result.message || result.verification_result || "Analysis complete",
        timestamp: new Date(),
        sources: result.sources || [],
        confidence: result.confidence,
        is_misinformation: result.is_misinformation,
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      console.error("Main error:", error);
      const errorMessage = {
        id: `error-${Date.now()}-${Math.random()}`,
        type: "ai",
        content:
          "Sorry, I encountered an error while verifying your claim. Please try again.",
        timestamp: new Date(),
        sources: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    setUploadedFiles((prev) => [...prev, ...files]);
  };

  const removeFile = (index) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith("image/")) return Image;
    if (file.type.startsWith("video/")) return Video;
    return Upload;
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      className={`h-full flex flex-col`}
      animate={{
        backgroundColor: isDarkMode ? "#111827" : "#f9fafb",
      }}
      transition={{
        duration: 0.6,
        ease: "easeInOut",
      }}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <motion.div
            key={message.id}
            className={`flex ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <div
              className={`flex items-end space-x-3 ${
                message.type === "user"
                  ? "flex-row-reverse space-x-reverse"
                  : ""
              }`}
            >
              {/* Avatar */}
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === "user" ? "bg-blue-500" : ""
                }`}
                animate={{
                  backgroundColor:
                    message.type === "user"
                      ? "#3b82f6"
                      : isDarkMode
                      ? "#374151"
                      : "#e5e7eb",
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut",
                }}
              >
                {message.type === "user" ? (
                  <div className="text-white font-bold text-sm">U</div>
                ) : (
                  <CheckCircle
                    className={`w-4 h-4 ${
                      isDarkMode ? "text-blue-400" : "text-blue-500"
                    }`}
                  />
                )}
              </motion.div>

              {/* Message Bubble */}
              <div
                className={`relative max-w-xs lg:max-w-md ${
                  message.type === "user" ? "text-right" : "text-left"
                }`}
              >
                <motion.div
                  className={`px-4 py-3 rounded-lg ${
                    message.type === "user" ? "text-white" : ""
                  }`}
                  animate={{
                    backgroundColor:
                      message.type === "user"
                        ? isDarkMode
                          ? "#2563eb"
                          : "#3b82f6"
                        : isDarkMode
                        ? "#1f2937"
                        : "#ffffff",
                    borderColor:
                      message.type === "user"
                        ? "transparent"
                        : isDarkMode
                        ? "#374151"
                        : "#e5e7eb",
                    color:
                      message.type === "user"
                        ? "#ffffff"
                        : isDarkMode
                        ? "#ffffff"
                        : "#111827",
                  }}
                  style={{
                    border: message.type === "user" ? "none" : "1px solid",
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeInOut",
                  }}
                >
                  <p className="text-sm">{message.content}</p>

                  {message.sources && message.sources.length > 0 && (
                    <div
                      className={`mt-3 pt-3 border-t ${
                        isDarkMode ? "border-gray-600" : "border-gray-300"
                      }`}
                    >
                      <p className="text-xs font-medium mb-2">Sources:</p>
                      <ul className="text-xs space-y-1">
                        {message.sources.map((source, index) => (
                          <li key={index} className="flex items-center">
                            <CheckCircle className="w-3 h-3 mr-2 text-green-500 flex-shrink-0" />
                            <span className="break-words">{source}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </motion.div>

                {/* Arrow */}
                <div
                  className={`absolute bottom-3 w-0 h-0 ${
                    message.type === "user"
                      ? "right-[-8px] border-l-8 border-l-blue-600 dark:border-l-blue-600"
                      : "left-[-8px] border-r-8 border-r-gray-800 dark:border-r-gray-800"
                  } border-t-8 border-t-transparent border-b-8 border-b-transparent`}
                ></div>
              </div>
            </div>
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            className="flex justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            <div className="flex items-end space-x-3">
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDarkMode ? "bg-gray-700" : "bg-gray-200"
                }`}
              >
                <CheckCircle
                  className={`w-4 h-4 ${
                    isDarkMode ? "text-blue-400" : "text-blue-500"
                  }`}
                />
              </div>

              {/* Loading Message Bubble */}
              <div className="relative max-w-xs lg:max-w-md text-left">
                <div
                  className={`px-4 py-3 rounded-lg ${
                    isDarkMode
                      ? "bg-gray-800 border border-gray-700 text-white"
                      : "bg-white border border-gray-200 text-gray-900"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    ></motion.div>
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.1,
                      }}
                    ></motion.div>
                    <motion.div
                      className="w-2 h-2 bg-gray-400 rounded-full"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: 0.2,
                      }}
                    ></motion.div>
                  </div>
                </div>

                {/* Arrow */}
                <div
                  className={`absolute bottom-3 left-[-8px] w-0 h-0 border-r-8 border-r-gray-800 dark:border-r-gray-800 border-t-8 border-t-transparent border-b-8 border-b-transparent`}
                ></div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* File Preview */}
      {uploadedFiles.length > 0 && (
        <motion.div
          className="px-6 py-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          <div className="flex flex-wrap gap-2">
            {uploadedFiles.map((file, index) => {
              const FileIcon = getFileIcon(file);
              return (
                <motion.div
                  key={index}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                    isDarkMode
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-gray-100 border border-gray-300"
                  }`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.2 }}
                >
                  <FileIcon className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-300 max-w-32 truncate">
                    {file.name}
                  </span>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Input Area */}
      <motion.div
        className={`border-t px-6 py-4 ${
          isDarkMode ? "border-gray-700" : "border-gray-200"
        }`}
        animate={{
          backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
        }}
        transition={{
          duration: 0.6,
          ease: "easeInOut",
        }}
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="file"
              id="file-upload"
              onChange={handleFileUpload}
              className="hidden"
            />
            <motion.label
              htmlFor="file-upload"
              className="p-2 rounded-lg cursor-pointer"
              animate={{
                color: isDarkMode ? "#9ca3af" : "#6b7280",
                backgroundColor: "transparent",
              }}
              whileHover={{
                color: isDarkMode ? "#d1d5db" : "#374151",
                backgroundColor: isDarkMode ? "#374151" : "#f3f4f6",
              }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
              }}
            >
              <Upload className="w-5 h-5" />
            </motion.label>
            <motion.button
              className="p-2 rounded-lg"
              animate={{
                color: isDarkMode ? "#9ca3af" : "#6b7280",
                backgroundColor: "transparent",
              }}
              whileHover={{
                color: isDarkMode ? "#d1d5db" : "#374151",
                backgroundColor: isDarkMode ? "#374151" : "#f3f4f6",
              }}
              transition={{
                duration: 0.6,
                ease: "easeInOut",
              }}
            >
              <Mic className="w-5 h-5" />
            </motion.button>
          </div>
          <motion.input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to verify something..."
            className={`flex-1 px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isDarkMode ? "placeholder-gray-400" : "placeholder-gray-500"
            }`}
            animate={{
              backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
              borderColor: isDarkMode ? "#374151" : "#d1d5db",
              color: isDarkMode ? "#ffffff" : "#111827",
            }}
            transition={{
              duration: 0.6,
              ease: "easeInOut",
            }}
          />
          <motion.button
            onClick={handleSendMessage}
            disabled={
              (!inputValue.trim() && uploadedFiles.length === 0) || isLoading
            }
            className="px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            animate={{
              backgroundColor: "#3b82f6",
            }}
            whileHover={{
              backgroundColor: "#2563eb",
              scale: 1.02,
            }}
            whileTap={{ scale: 0.98 }}
            transition={{
              duration: 0.6,
              ease: "easeInOut",
            }}
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ChatbotView;
