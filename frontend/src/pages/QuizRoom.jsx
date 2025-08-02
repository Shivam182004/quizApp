import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Card, Radio, Checkbox, Input, Progress, Space, Alert, Avatar, List, Result, message, Spin, Typography, Row, Col, Tag, Divider } from "antd";
import { AuthContext } from "../config/AuthContext";
import socket from "../socket";
import axios from "../utils/axios";
import { PlayCircleOutlined, CrownOutlined, TeamOutlined, ClockCircleOutlined, CheckOutlined, ArrowRightOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import Leaderboard from "./Leaderboard";

const { Title, Text } = Typography;

const QuizRoom = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { auth } = useContext(AuthContext);

  const [quiz, setQuiz] = useState({ createdBy: null });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [quizStarted, setQuizStarted] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [maxTime, setMaxTime] = useState(30);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [quizEnded, setQuizEnded] = useState(false);
  const [isCreator, setIsCreator] = useState(false);
  const [showCreatorLeaderboard, setShowCreatorLeaderboard] = useState(false);
  const timerRef = useRef(null);

  const fetchQuizDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/quiz/${code}`
      );
      const quizData = response.data;

      if (!quizData) {
        throw new Error("Quiz not found");
      }

      const isCreatorStatus = quizData.creatorName === auth.username;

      setQuiz(quizData);
      setQuestions(quizData.questions || []);
      setQuizStarted(quizData.status === "active");
      setIsCreator(isCreatorStatus);

      if (isCreatorStatus && quizData.status === "active") {
        setShowCreatorLeaderboard(true);
      }

      if (quizData.participants) {
        setPlayers(quizData.participants);
      }

      setError(null);
    } catch (error) {
      console.error("Failed to fetch quiz details:", error);
      const errorMessage = error.response?.data?.error || "Failed to load quiz";
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth.userId) {
      message.error("Please login to join the quiz");
      navigate("/login");
      return;
    }

    if (code) {
      fetchQuizDetails();
    }
  }, [code, auth.userId, navigate]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("join-room", {
      code,
      username: auth.username,
      userId: auth.userId,
    });

    socket.on("quiz-ended", (data) => {
      setQuizEnded(true);
      setQuiz((prev) => (prev ? { ...prev, status: "completed" } : prev));

      if (data.finalScores) {
        localStorage.setItem(
          `quiz_${code}_final_scores`,
          JSON.stringify(data.finalScores)
        );
      }

      localStorage.setItem(`quiz_${code}_code`, code);

      message.info("Quiz has ended. Redirecting to leaderboard...");
      setTimeout(() => {
        navigate(`/leaderboard/${code}`);
      }, 1500);
    });

    socket.on("quiz-error", (error) => {
      message.error(error.message);
    });

    socket.on("player-joined", (data) => {
      setPlayers((currentPlayers) => {
        const playerExists = currentPlayers.some(
          (p) => p.userId === data.userId
        );
        if (!playerExists) {
          return [...currentPlayers, data];
        }
        return currentPlayers;
      });
      message.info(`${data.username} joined the quiz`);
    });

    socket.on("player-list", (playerList) => {
      setPlayers(playerList);
    });

    socket.on("player-left", (data) => {
      setPlayers((currentPlayers) =>
        currentPlayers.filter((p) => p.userId !== data.userId)
      );
      message.info(`${data.username} left the quiz`);
    });

    socket.on("quiz-started", (data) => {
      setQuizStarted(true);

      if (data.questions) {
        setQuestions(data.questions);
        setQuestionIndex(0);

        const firstQuestionTimeLimit = data.questions[0]?.timeLimit || 30;
        setTimeLeft(firstQuestionTimeLimit);
        setMaxTime(firstQuestionTimeLimit);
      }

      setSubmitted(false);
      setAnswer("");
    });

    socket.on("next-question", (data) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (data.question) {
        setQuestionIndex(data.questionNumber - 1);
        setAnswer("");
        setSubmitted(false);

        const questionTimeLimit = data.question.timeLimit || 30;
        setTimeLeft(questionTimeLimit);
        setMaxTime(questionTimeLimit);
      }
    });

    socket.on("answer-result", (data) => {
      setScore(data.score);

      if (data.correct) {
        message.success(`Correct! Your current score is ${data.score}`);
      } else {
        message.error(`Incorrect. Your current score is ${data.score}`);
      }
    });

    socket.on("player-submitted", (data) => {
      message.info(`${data.username} submitted their answer`);
    });

    return () => {
      socket.emit("leave-room", {
        code,
        username: auth.username,
        userId: auth.userId,
      });

      socket.off("player-joined");
      socket.off("player-left");
      socket.off("player-list");
      socket.off("quiz-started");
      socket.off("quiz-ended");
      socket.off("quiz-error");
      socket.off("next-question");
      socket.off("answer-result");
      socket.off("player-submitted");

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [code, auth.username, auth.userId, navigate]);

  const handleStart = async () => {
    if (!isCreator || quiz.creatorName !== auth.username) {
      message.error("Only the quiz creator can start the quiz");
      return;
    }

    try {
      const response = await axios.post(`/api/quiz/start`, {
        code,
        creatorName: auth.username,
      });

      if (response.data.success) {
        socket.emit("start-quiz", {
          code,
          userId: auth.userId,
        });

        setQuizStarted(true);
        setQuestions(response.data.questions);

        const firstQuestionTimeLimit =
          response.data.questions[0]?.timeLimit || 30;
        setTimeLeft(firstQuestionTimeLimit);
        setMaxTime(firstQuestionTimeLimit);

        setShowCreatorLeaderboard(true);
        message.success("Quiz started successfully!");
      }
    } catch (error) {
      console.error("Failed to start quiz:", error);
      message.error(error.response?.data?.error || "Failed to start quiz");
    }
  };

  useEffect(() => {
    if (quizStarted && !quizEnded) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;

          if (newTime <= 0) {
            clearInterval(timerRef.current);
            timerRef.current = null;

            if (isCreator) {
              handleQuestionTimeout();
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
    }
  }, [quizStarted, quizEnded, questionIndex]);

  const handleSubmit = async () => {
    if (!answer && Array.isArray(answer) && answer.length === 0) {
      message.warning("Please select an answer");
      return;
    }

    setLoading(true);
    setSubmitted(true);

    try {
      socket.emit("submit-answer", {
        code,
        questionIndex,
        answer: Array.isArray(answer) ? answer.sort().join(",") : answer,
        username: auth.username,
        userId: auth.userId,
      });

      const response = await axios.post(`/api/quiz/submit-answer`, {
        code,
        userId: auth.userId,
        questionIndex,
        answer: Array.isArray(answer) ? answer.sort().join(",") : answer,
      });

      if (response.data.success) {
        setScore(response.data.currentScore);

        if (response.data.correct) {
          message.success(
            `Correct! You earned ${response.data.points} points!`
          );
        } else {
          message.error(
            `Incorrect. The correct answer was: ${response.data.correctAnswer}`
          );
        }
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
      message.error("Failed to submit answer");
    } finally {
      setLoading(false);
    }
  };

  const handleEndQuiz = async () => {
    if (!isCreator) {
      message.error("Only the quiz creator can end the quiz");
      return;
    }

    try {
      const response = await axios.post(`/api/quiz/${code}/end`, {
        code,
        createdBy: quiz.createdBy,
        userId: auth.userId,
      });

      if (response.data.success) {
        socket.emit("end-quiz", {
          code,
          createdBy: quiz.createdBy,
          userId: auth.userId,
          finalScores: response.data.leaderboard,
        });

        setQuizEnded(true);
        message.success("Quiz ended successfully");

        setTimeout(() => {
          navigate(`/leaderboard/${code}`);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to end quiz:", error);

      if (error.response?.status === 403) {
        message.error("Only quiz creator can end the quiz");
      } else if (error.response?.status === 400) {
        message.error("Quiz is already completed");
      } else if (error.response?.status === 404) {
        message.error("Quiz not found");
      } else {
        message.error(error.response?.data?.error || "Failed to end quiz");
      }
    }
  };

  const handleQuestionTimeout = async () => {
    if (questionIndex >= questions.length - 1) {
      await handleEndQuiz();
    } else {
      const nextIndex = questionIndex + 1;

      socket.emit("move-to-next-question", {
        code,
        questionNumber: nextIndex + 1,
        question: questions[nextIndex],
      });

      setQuestionIndex(nextIndex);
      setAnswer("");
      setSubmitted(false);

      const nextQuestionTimeLimit = questions[nextIndex]?.timeLimit || 30;
      setTimeLeft(nextQuestionTimeLimit);
      setMaxTime(nextQuestionTimeLimit);
    }
  };

  const currentQuestion = questions[questionIndex] || {};

  const renderQuestionOptions = () => {
    if (currentQuestion.type === "single") {
      return (
        <Radio.Group
          onChange={(e) => setAnswer(e.target.value)}
          value={answer}
          disabled={submitted}
          className="w-full"
        >
          <Space direction="vertical" className="w-full">
            {currentQuestion.options?.map((opt, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.02 }}
                className="w-full"
              >
                <Radio value={opt} className="w-full">
                  <Card
                    hoverable={!submitted}
                    className={`w-full mb-4 transition-all duration-200 ${
                      answer === opt 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <Text className="text-lg">{opt}</Text>
                  </Card>
                </Radio>
              </motion.div>
            ))}
          </Space>
        </Radio.Group>
      );
    }

    if (currentQuestion.type === "multiple") {
      return (
        <Checkbox.Group
          onChange={setAnswer}
          value={answer}
          disabled={submitted}
          className="w-full"
        >
          <Space direction="vertical" className="w-full">
            {currentQuestion.options?.map((opt, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ scale: 1.02 }}
                className="w-full"
              >
                <Checkbox value={opt} className="w-full">
                  <Card
                    hoverable={!submitted}
                    className={`w-full mb-4 transition-all duration-200 ${
                      answer?.includes(opt)
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <Text className="text-lg">{opt}</Text>
                  </Card>
                </Checkbox>
              </motion.div>
            ))}
          </Space>
        </Checkbox.Group>
      );
    }

    return (
      <Input.TextArea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={submitted}
        rows={4}
        className="w-full rounded-lg"
        placeholder="Type your answer here..."
      />
    );
  };

  const renderCreatorControls = () => {
    if (!isCreator || quiz.creatorName !== auth.username) {
      return null;
    }

    return (
      <Card className="bg-blue-50 border-blue-200 mb-6">
        <Title level={5} className="mb-4">
          <CrownOutlined /> Host Controls
        </Title>
        {players.length < 2 ? (
          <Alert
            message="Waiting for Players"
            description="You need at least 2 players to start the quiz"
            type="warning"
            showIcon
            className="mb-4"
          />
        ) : (
          <Alert
            message="Ready to Start"
            description={`${players.length} players are waiting`}
            type="success"
            showIcon
            className="mb-4"
          />
        )}
        <motion.div whileHover={{ scale: 1.02 }}>
          <Button
            type="primary"
            size="large"
            block
            onClick={handleStart}
            disabled={players.length < 2}
            className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none"
            icon={<PlayCircleOutlined />}
          >
            {players.length < 2 ? 'Waiting for Players...' : 'Start Quiz Now'}
          </Button>
        </motion.div>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-2xl shadow-xl border-0 rounded-xl">
          <div className="text-center py-12">
            <Spin size="large" className="mb-4" />
            <Title level={3} className="text-gray-700">Loading Quiz...</Title>
            <Text type="secondary">Preparing your quiz experience</Text>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-2xl shadow-xl border-0 rounded-xl">
          <Result
            status="error"
            title="Failed to load quiz"
            subTitle={error}
            extra={[
              <Button
                type="primary"
                key="home"
                onClick={() => navigate("/home")}
                className="bg-blue-600 hover:bg-blue-700 border-none"
              >
                Back to Home
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card className="w-full max-w-2xl shadow-xl border-0 rounded-xl">
          <Result
            status="404"
            title="Quiz Not Found"
            subTitle="The quiz you're looking for doesn't exist."
            extra={[
              <Button
                type="primary"
                key="home"
                onClick={() => navigate("/home")}
                className="bg-blue-600 hover:bg-blue-700 border-none"
              >
                Back to Home
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  if (isCreator && quizStarted && showCreatorLeaderboard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card
          className="w-full max-w-6xl mx-auto shadow-xl border-0 rounded-xl"
          title={
            <div className="flex items-center justify-between">
              <Title level={3} className="m-0">
                {quiz.title} - <span className="text-blue-600">Host View</span>
              </Title>
              <Tag color="gold" className="text-lg">
                <CrownOutlined /> Host
              </Tag>
            </div>
          }
        >
          {!quizEnded ? (
            <>
              <div className="mb-8">
                <Row gutter={16}>
                  <Col span={24} md={8}>
                    <Card className="mb-4">
                      <Title level={5} className="text-center">
                        Current Question
                      </Title>
                      <Divider />
                      <Text className="text-lg">{questions[questionIndex]?.text}</Text>
                    </Card>
                  </Col>
                  <Col span={24} md={16}>
                    <Card>
                      <div className="flex justify-between items-center mb-4">
                        <Title level={5} className="m-0">
                          Question {questionIndex + 1} of {questions.length}
                        </Title>
                        <div className="flex items-center">
                          <ClockCircleOutlined className="mr-2 text-blue-500" />
                          <Text strong className={timeLeft <= 5 ? 'text-red-500' : ''}>
                            {timeLeft}s remaining
                          </Text>
                        </div>
                      </div>
                      <Progress
                        percent={(timeLeft / maxTime) * 100}
                        status={timeLeft < 5 ? "exception" : "active"}
                        strokeColor={
                          timeLeft > maxTime * 0.5
                            ? "#52c41a"
                            : timeLeft > maxTime * 0.2
                            ? "#faad14"
                            : "#f5222d"
                        }
                      />
                    </Card>
                  </Col>
                </Row>
              </div>

              <Leaderboard code={code} live={true} isCreator={true} />
            </>
          ) : (
            <Result
              status="success"
              title="Quiz Completed!"
              subTitle="Redirecting to the final leaderboard..."
              extra={
                <Button 
                  type="primary" 
                  onClick={() => navigate(`/leaderboard/${code}`)}
                  className="bg-blue-600 hover:bg-blue-700 border-none"
                >
                  View Final Leaderboard
                </Button>
              }
            />
          )}
        </Card>
      </div>
    );
  }

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Card
          className="w-full max-w-4xl mx-auto shadow-xl border-0 rounded-xl"
          title={
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <Title level={3} className="m-0">
                {quiz.title || "Quiz Lobby"}
              </Title>
              <div className="mt-2 md:mt-0">
                <Tag color="blue" className="text-lg">
                  Code: {code}
                </Tag>
                {isCreator && (
                  <Tag color="gold" className="text-lg">
                    <CrownOutlined /> Host
                  </Tag>
                )}
              </div>
            </div>
          }
        >
          <div className="mb-6">
            <Card className="mb-6">
              <Title level={5} className="mb-2">
                <TeamOutlined /> Players in Lobby ({players.length})
              </Title>
              <Avatar.Group maxCount={5} size="large">
                {players.map((player) => (
                  <Avatar 
                    key={player.userId} 
                    className={player.userId === auth.userId ? 'ring-2 ring-blue-500' : ''}
                  >
                    {player.username?.[0]?.toUpperCase()}
                  </Avatar>
                ))}
              </Avatar.Group>
            </Card>

            {renderCreatorControls()}

            {!isCreator && (
              <Card>
                <Alert
                  message="Waiting for Host"
                  description="The quiz will start when the host begins the game"
                  type="info"
                  showIcon
                />
              </Card>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
      <Card
        className="w-full max-w-4xl mx-auto shadow-xl border-0 rounded-xl"
        title={
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <Title level={3} className="m-0">
              {quiz.title}
            </Title>
            <div className="mt-2 md:mt-0">
              <Tag color="blue" className="text-lg">
                Score: {score} pts
              </Tag>
            </div>
          </div>
        }
      >
        {!quizEnded ? (
          <>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <Text strong>
                  Question {questionIndex + 1} of {questions.length}
                </Text>
                <div className="flex items-center">
                  <ClockCircleOutlined className="mr-2 text-blue-500" />
                  <Text strong className={timeLeft <= 5 ? 'text-red-500' : ''}>
                    {timeLeft}s remaining
                  </Text>
                </div>
              </div>
              <Progress
                percent={(timeLeft / maxTime) * 100}
                status={timeLeft < 5 ? "exception" : "active"}
                strokeColor={
                  timeLeft > maxTime * 0.5
                    ? "#52c41a"
                    : timeLeft > maxTime * 0.2
                    ? "#faad14"
                    : "#f5222d"
                }
              />
            </div>

            <Card className="mb-6">
              <Title level={4} className="mb-4">
                {questions[questionIndex]?.text}
              </Title>
              {renderQuestionOptions()}
            </Card>

            <div className="text-center">
              {submitted ? (
                <Alert
                  message="Answer Submitted"
                  description="Waiting for the next question..."
                  type="success"
                  showIcon
                  className="mb-4"
                />
              ) : (
                <motion.div whileHover={{ scale: 1.02 }}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleSubmit}
                    disabled={
                      !answer || (Array.isArray(answer) && answer.length === 0)
                    }
                    loading={loading}
                    className="h-12 px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none"
                    icon={<ArrowRightOutlined />}
                  >
                    Submit Answer
                  </Button>
                </motion.div>
              )}
            </div>
          </>
        ) : (
          <Result
            status="success"
            title="Quiz Completed!"
            subTitle={`Your final score is ${score} points`}
            extra={[
              <Button
                type="primary"
                key="leaderboard"
                onClick={() => navigate(`/leaderboard/${code}`)}
                className="bg-blue-600 hover:bg-blue-700 border-none"
              >
                View Leaderboard
              </Button>,
              <Button
                key="home"
                onClick={() => navigate("/home")}
                className="ml-2"
              >
                Back to Home
              </Button>,
            ]}
          />
        )}
      </Card>
    </div>
  );
};

export default QuizRoom;