import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from "react-router-dom";

import ProfileDashboard from "./pages/Profile/ProfileDashboard";
import Home from "./components/Home";
import StutterHelp from "./components/StutterHelp";
import Therapy from "./components/Therapy";

import Login from "./pages/Auth/Login";
import SignUp from "./pages/Auth/SignUp";

import { useUser } from "./context/UserContext";

import "./App.css";

const App = () => {
  const { user, logout } = useUser();
  const isLoggedIn = !!user;

  return (
    <Router>
      <div className="app">

        {/* ── NAVBAR ── */}
        <nav className="navbar">
          <div className="logo2">
            <Link to="/">SPEAK<span>EASE</span></Link>
          </div>

          <div className="nav-links">
            <Link className="nav-link" to="/">Home</Link>

            {!isLoggedIn ? (
              <>
                <Link className="nav-link" to="/login">Login</Link>
                <Link className="nav-link nav-link--cta" to="/signup">Sign Up</Link>
              </>
            ) : (
              <>
                <Link className="nav-link" to="/stutter-help">Stutter Help</Link>
                <Link className="nav-link" to="/therapy">Therapy</Link>

                {/* Both point to same component */}
                <Link className="nav-link" to="/dashboard">Profile</Link>
                

                <button className="nav-logout" onClick={logout}>Logout</button>
              </>
            )}
          </div>
        </nav>

        {/* ── ROUTES ── */}
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

            {/* ✅ FIXED: using ProfileDashboard instead of undefined Dashboard */}
            <Route
              path="/dashboard"
              element={isLoggedIn ? <ProfileDashboard /> : <Navigate to="/login" />}
            />

            <Route
              path="/profile"
              element={isLoggedIn ? <ProfileDashboard /> : <Navigate to="/login" />}
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <p>© {new Date().getFullYear()} SPEAKEASE</p>
        </footer>

      </div>
    </Router>
  );
};

export default App;