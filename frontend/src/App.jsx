import { useState, useEffect } from "react";
import MainApp from "./components/MainApp";

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Initialize from localStorage or default to false
    const saved = localStorage.getItem("isDarkMode");
    return saved ? JSON.parse(saved) : false;
  });

  // Save to localStorage whenever dark mode changes
  useEffect(() => {
    localStorage.setItem("isDarkMode", JSON.stringify(isDarkMode));
    // Also set the dark class on the document element for Tailwind CSS
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  return <MainApp isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />;
}

export default App;
