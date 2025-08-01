import React from "react";
import { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Loading from './components/Loading' // Create a loading component
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import CreateQuiz from "./pages/CreateQuiz";
import JoinQuiz from "./pages/JoinQuiz";
import { AuthProvider } from "./config/AuthContext";

// Lazy load your pages
const Home = lazy(() => import('./pages/Home'))
const QuizRoom = lazy(() => import('./pages/QuizRoom'))
const Leaderboard = lazy(() => import('./pages/Leaderboard'))

function App() {
  return (
    <Router>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/home" element={<Home />} />
            <Route path="/create" element={<CreateQuiz />} />
            <Route path="/join" element={<JoinQuiz />} />
            <Route path="/quiz/:code" element={<QuizRoom />} />
            <Route path="/leaderboard/:code" element={<Leaderboard />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </Router>
  );
}

export default App;

