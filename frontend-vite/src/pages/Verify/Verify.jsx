import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquare, Plus, Search, X } from "lucide-react";
import ChatbotView from "./ChatbotView";
import "./Verify.css";

const Verify = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState([
    { id: 1, title: "New Chat", timestamp: new Date() },
  ]);
  const [activeChatId, setActiveChatId] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const handleNewChat = () => {
    const newChat = {
      id: Date.now(),
      title: "New Chat",
      timestamp: new Date(),
    };
    setChatHistory([newChat, ...chatHistory]);
    setActiveChatId(newChat.id);
  };

  const filteredHistory = chatHistory.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-black">
      {/* Left Sidebar */}
      <motion.div
        initial={{ width: sidebarOpen ? 280 : 0 }}
        animate={{ width: sidebarOpen ? 280 : 0 }}
        transition={{ duration: 0.3 }}
        className={`${
          sidebarOpen ? "border-r border-gray-900" : ""
        } bg-black flex flex-col overflow-hidden`}
      >
        {sidebarOpen && (
          <>
            {/* New Chat Button */}
            <div className="p-4 border-b border-gray-700">
              <button
                onClick={handleNewChat}
                className="w-full flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>New Chat</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="p-4 border-b border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black text-white rounded-lg border border-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredHistory.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    activeChatId === chat.id
                      ? "bg-blue-600 text-white"
                      : "text-gray-300 hover:bg-gray-900"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="flex-1 truncate text-sm">{chat.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col relative">
        {/* Sidebar Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-10 p-2 bg-gray-800 rounded-lg text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </button>

        <ChatbotView isDarkMode={true} setIsDarkMode={() => {}} />
      </div>
    </div>
  );
};

export default Verify;

