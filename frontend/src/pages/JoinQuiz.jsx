// src/pages/JoinQuiz.js
import React, { useState, useContext } from "react";
import { Input, Button, Card, message } from "antd";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../config/AuthContext";
import axios from "../utils/axios";

const JoinQuiz = () => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);

  const handleJoin = async () => {
    if (!code.trim()) {
      message.error("Please enter a quiz code");
      return;
    }

    if (!auth.userId) {
      message.error("Please login to join the quiz");
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // First, check if the user is the creator
      const checkResponse = await axios.get(`/api/quiz/${code.trim()}`);

      if (!checkResponse.data) {
        throw new Error("Quiz not found");
      }

      const quiz = checkResponse.data;
      const isCreator = quiz.creatorName === auth.username;

      if (isCreator) {
        message.info("Welcome back to your quiz!");
        navigate(`/quiz/${code}`, { 
          state: { 
            isCreator: true,
            quiz: quiz 
          }
        });
        return;
      }

      // If user is not the creator, proceed with join
      const requestData = {
        code: code.trim(),
        userId: auth.userId,
        username: auth.username
      };

      const response = await axios.post(
        `/api/quiz/join`,
        requestData
      );

      if (response.data.success) {
        message.success(response.data.message || "Successfully joined the quiz!");
        
        // Navigate to quiz room with updated state
        navigate(`/quiz/${code}`, { 
          state: { 
            isCreator: false,
            quiz: {
              ...response.data.quiz,
              code: code.trim()
            }
          }
        });
      } else {
        throw new Error(response.data.error || "Failed to join quiz");
      }
    } catch (err) {
      console.error("Join quiz error:", err);
      
      // Handle different types of errors
      if (!err.response) {
        message.error("Network error. Please check your connection.");
        return;
      }

      // Handle specific error cases
      if (err.response.status === 404) {
        message.error("Quiz not found. Please check the code.");
        return;
      }

      if (err.response.status === 400) {
        message.error(err.response.data.error || "Invalid quiz code or quiz has already started.");
        return;
      }

      // Generic error handling
      const errorMessage = err.response?.data?.error || err.message || "Failed to join quiz";
      message.error(errorMessage);
      
      // Log detailed error if available
      if (err.response?.data?.details) {
        console.error("Error details:", err.response.data.details);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card title="Join Quiz" className="auth-card">
        <Input
          placeholder="Enter Quiz Code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onPressEnter={handleJoin}
          maxLength={6}
          disabled={loading}
        />
        <Button 
          type="primary" 
          block 
          onClick={handleJoin} 
          loading={loading}
          disabled={!code.trim()}
          style={{ marginTop: "1rem" }}
        >
          Join
        </Button>
      </Card>
    </div>
  );
};

export default JoinQuiz;
