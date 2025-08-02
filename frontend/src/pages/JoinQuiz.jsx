import React, { useState, useContext } from "react";
import { Input, Button, Card, message, Typography, Space } from "antd";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../config/AuthContext";
import axios from "../utils/axios";
import { motion } from "framer-motion";
import { ArrowRightOutlined, TeamOutlined, LockOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

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
      
      if (!err.response) {
        message.error("Network error. Please check your connection.");
        return;
      }

      if (err.response.status === 404) {
        message.error("Quiz not found. Please check the code.");
        return;
      }

      if (err.response.status === 400) {
        message.error(err.response.data.error || "Invalid quiz code or quiz has already started.");
        return;
      }

      const errorMessage = err.response?.data?.error || err.message || "Failed to join quiz";
      message.error(errorMessage);
      
      if (err.response?.data?.details) {
        console.error("Error details:", err.response.data.details);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card
          className="shadow-xl border-0 rounded-xl overflow-hidden"
          cover={
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
              <TeamOutlined className="text-white text-4xl mb-3" />
              <Title level={3} className="text-white m-0">Join a Quiz</Title>
            </div>
          }
        >
          <div className="p-6">
            <Text className="block text-gray-600 mb-6 text-center">
              Enter the quiz code provided by your host to join the game
            </Text>

            <Input
              size="large"
              placeholder="Enter 6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onPressEnter={handleJoin}
              maxLength={6}
              disabled={loading}
              prefix={<LockOutlined className="text-gray-400" />}
              className="rounded-lg h-12 mb-6 text-center text-lg font-mono tracking-widest"
            />

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                type="primary"
                size="large"
                block
                onClick={handleJoin}
                loading={loading}
                disabled={!code.trim()}
                className="h-12 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none shadow-md"
                icon={<ArrowRightOutlined />}
              >
                {loading ? 'Joining...' : 'Join Quiz'}
              </Button>
            </motion.div>

            <div className="mt-6 text-center">
              <Text type="secondary">
                Don't have a code? Ask your host to share one with you
              </Text>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default JoinQuiz;