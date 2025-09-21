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
} from "lucide-react";
import EducationalSidebar from "../components/EducationalSidebar";

const Chatbot = ({ isDarkMode, setIsDarkMode }) => {
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
  const [verificationResult, setVerificationResult] = useState(null);

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const fileData = {
          id: Date.now() + Math.random(),
          name: file.name,
          type: file.type,
          size: file.size,
          data: e.target.result,
          url: URL.createObjectURL(file),
        };
        setUploadedFiles((prev) => [...prev, fileData]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (fileId) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() && uploadedFiles.length === 0) return;

    const userMessage = {
      id: Date.now(),
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
      // Call your existing verification API
      const formData = new FormData();
      if (inputValue.trim()) {
        formData.append("text_input", inputValue);
      }

      uploadedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch("http://127.0.0.1:8000/chatbot/verify", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      // Store verification result for educational content
      setVerificationResult(result);

      const aiResponse = {
        id: Date.now() + 1,
        type: "ai",
        content:
          result.message ||
          "I'm analyzing your claim and searching for verification sources...",
        timestamp: new Date(),
        sources: [],
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (error) {
      console.error("Verification failed:", error);
      const errorResponse = {
        id: Date.now() + 1,
        type: "ai",
        content:
          "Sorry, I encountered an error while verifying your claim. Please try again.",
        timestamp: new Date(),
        sources: [],
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <motion.div
      className={`h-screen flex`}
      animate={{
        backgroundColor: isDarkMode ? "#111827" : "#f9fafb",
      }}
      transition={{
        duration: 0.6,
        ease: "easeInOut",
      }}
    >
      {/* Main Chat Area - 70% */}
      <div className="flex-1 flex flex-col" style={{ width: "70%" }}>
        {/* Header */}
        <motion.div
          className={`border-b px-6 py-4 ${
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <motion.h1
                  className="text-lg font-semibold"
                  animate={{
                    color: isDarkMode ? "#ffffff" : "#111827",
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeInOut",
                  }}
                >
                  FactCheck AI
                </motion.h1>
                <motion.p
                  className="text-sm"
                  animate={{
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeInOut",
                  }}
                >
                  AI-powered verification assistant
                </motion.p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg ${
                  isDarkMode ? "hover:bg-gray-600" : "hover:bg-gray-300"
                }`}
                animate={{
                  backgroundColor: isDarkMode ? "#374151" : "#e5e7eb",
                  color: isDarkMode ? "#fbbf24" : "#4b5563",
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut",
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <AnimatePresence mode="wait">
                  {isDarkMode ? (
                    <motion.div
                      key="sun"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Sun className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="moon"
                      initial={{ rotate: -90, opacity: 0 }}
                      animate={{ rotate: 0, opacity: 1 }}
                      exit={{ rotate: 90, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Moon className="w-5 h-5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <motion.span
                  className="text-sm"
                  animate={{
                    color: isDarkMode ? "#9ca3af" : "#6b7280",
                  }}
                  transition={{
                    duration: 0.6,
                    ease: "easeInOut",
                  }}
                >
                  Online
                </motion.span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {message.type === "ai" ? (
                <div className="flex items-start space-x-3 max-w-2xl">
                  {/* AI Icon */}
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>

                  {/* Thought Bubble */}
                  <div className="relative">
                    <motion.div
                      className={`px-4 py-3 rounded-lg ${
                        isDarkMode
                          ? "border border-gray-700"
                          : "border border-gray-200"
                      }`}
                      animate={{
                        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
                      }}
                      transition={{
                        duration: 0.6,
                        ease: "easeInOut",
                      }}
                    >
                      <motion.p
                        className="text-sm"
                        animate={{
                          color: isDarkMode ? "#ffffff" : "#111827",
                        }}
                        transition={{
                          duration: 0.6,
                          ease: "easeInOut",
                        }}
                      >
                        {message.content}
                      </motion.p>

                      {/* File attachments */}
                      {message.files && message.files.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.files.map((file) => (
                            <div
                              key={file.id}
                              className="flex items-center space-x-2"
                            >
                              {file.type.startsWith("image/") ? (
                                <img
                                  src={file.url}
                                  alt={file.name}
                                  className="w-16 h-16 object-cover rounded"
                                />
                              ) : file.type.startsWith("video/") ? (
                                <video
                                  src={file.url}
                                  className="w-16 h-16 object-cover rounded"
                                  controls
                                />
                              ) : (
                                <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                                  <span className="text-xs text-gray-600">
                                    {file.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sources */}
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-2">
                          <motion.p
                            className="text-xs mb-1"
                            animate={{
                              color: isDarkMode ? "#9ca3af" : "#6b7280",
                            }}
                            transition={{
                              duration: 0.6,
                              ease: "easeInOut",
                            }}
                          >
                            Sources:
                          </motion.p>
                          <div className="space-y-1">
                            {message.sources.map((source, index) => (
                              <a
                                key={index}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`text-xs block ${
                                  isDarkMode
                                    ? "text-blue-400 hover:text-blue-300"
                                    : "text-blue-600 hover:text-blue-800"
                                }`}
                              >
                                {source.title}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </motion.div>

                    {/* Thought bubble tail */}
                    <div
                      className={`absolute left-0 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent ${
                        isDarkMode ? "border-r-gray-800" : "border-r-white"
                      }`}
                      style={{ transform: "translateX(-8px)" }}
                    ></div>
                    <div
                      className={`absolute left-0 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent ${
                        isDarkMode ? "border-r-gray-700" : "border-r-gray-200"
                      }`}
                      style={{ transform: "translateX(-7px)" }}
                    ></div>
                  </div>
                </div>
              ) : (
                <div className="max-w-2xl px-4 py-3 rounded-lg bg-blue-500 text-white">
                  <p className="text-sm">{message.content}</p>

                  {/* File attachments for user messages */}
                  {message.files && message.files.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {message.files.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center space-x-2"
                        >
                          {file.type.startsWith("image/") ? (
                            <img
                              src={file.url}
                              alt={file.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          ) : file.type.startsWith("video/") ? (
                            <video
                              src={file.url}
                              className="w-16 h-16 object-cover rounded"
                              controls
                            />
                          ) : (
                            <div className="w-16 h-16 bg-blue-400 rounded flex items-center justify-center">
                              <span className="text-xs text-white">
                                {file.name}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex items-start space-x-3 max-w-2xl">
                {/* AI Icon */}
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>

                {/* Thought Bubble */}
                <div className="relative">
                  <div
                    className={`px-4 py-3 rounded-lg ${
                      isDarkMode
                        ? "bg-gray-800 border border-gray-700"
                        : "bg-white border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  {/* Thought bubble tail */}
                  <div
                    className={`absolute left-0 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent ${
                      isDarkMode ? "border-r-gray-800" : "border-r-white"
                    }`}
                    style={{ transform: "translateX(-8px)" }}
                  ></div>
                  <div
                    className={`absolute left-0 top-4 w-0 h-0 border-t-8 border-b-8 border-r-8 border-transparent ${
                      isDarkMode ? "border-r-gray-700" : "border-r-gray-200"
                    }`}
                    style={{ transform: "translateX(-7px)" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

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
          {/* File previews */}
          {uploadedFiles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="relative">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : file.type.startsWith("video/") ? (
                    <video
                      src={file.url}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                      <span className="text-xs text-gray-600">{file.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(file.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-3">
            <div className="flex-1">
              <motion.input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me to verify a claim, analyze an image, or check a video..."
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                animate={{
                  backgroundColor: isDarkMode ? "#374151" : "#ffffff",
                  borderColor: isDarkMode ? "#4b5563" : "#d1d5db",
                  color: isDarkMode ? "#ffffff" : "#111827",
                }}
                transition={{
                  duration: 0.6,
                  ease: "easeInOut",
                }}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="file"
                id="file-upload"
                accept="image/*,video/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Upload className="w-5 h-5" />
              </label>
              <button
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode
                    ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>
              <button
                onClick={handleSendMessage}
                disabled={
                  (!inputValue.trim() && uploadedFiles.length === 0) ||
                  isLoading
                }
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Send className="w-4 h-4" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Educational Sidebar - 30% */}
      <EducationalSidebar
        isDarkMode={isDarkMode}
        verificationResult={verificationResult}
      />
    </motion.div>
  );
};

export default Chatbot;
