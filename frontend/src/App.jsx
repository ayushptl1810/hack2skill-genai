import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import Chatbot from "./pages/Chatbot";
import EducationalPage from "./pages/EducationalPage";
import Navigation from "./components/Navigation";

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  return (
    <Router>
      <div className="relative">
        <Navigation isDarkMode={isDarkMode} />
        <Routes>
          <Route
            path="/"
            element={
              <Chatbot isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
            }
          />
          <Route
            path="/learn"
            element={
              <EducationalPage
                isDarkMode={isDarkMode}
                setIsDarkMode={setIsDarkMode}
              />
            }
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
