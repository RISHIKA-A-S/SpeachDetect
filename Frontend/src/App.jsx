import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";

import Home from "./components/Home";
import StutterHelp from "./components/StutterHelp";
import Therapy from "./components/Therapy";

import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/SignUp";

import { useUser } from "./context/UserContext";

import "./App.css";

const App = () => {
  const { user, clearUser } = useUser();
  const isLoggedIn = !!user;

  return (
    <Router>
      <div className="app">

        {/* NAVBAR */}
        <nav className="navbar">
          <div className="logo2">
            <Link to="/">
              SPEAK<span>EASE</span>
              <img src="/fslogov1.png" alt="logo" className="logo1" />
            </Link>
          </div>

          <div className="nav-links">
            <Link to="/">Home</Link>

            {!isLoggedIn ? (
              <>
                <Link to="/login">Login</Link>
                <Link to="/signup">SignUp</Link>
              </>
            ) : (
              <>
                <Link to="/stutter-help">Stutter Help</Link>
                <Link to="/therapy">Therapy</Link>
                
                <button onClick={clearUser}>Logout</button>
              </>
            )}
          </div>
        </nav>

        {/* ROUTES */}
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<SignUp />} />
            
            <Route
              path="/stutter-help"
              element={isLoggedIn ? <StutterHelp /> : <Navigate to="/login" />}
            />

            <Route
              path="/therapy"
              element={isLoggedIn ? <Therapy /> : <Navigate to="/login" />}
            />
          </Routes>
        </main>

        {/* FOOTER */}
        <footer className="footer">
          <p>© {new Date().getFullYear()} SPEAKEASE</p>
        </footer>

      </div>
    </Router>
  );
};

export default App;