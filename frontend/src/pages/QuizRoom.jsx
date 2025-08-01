import React, { useEffect, useState, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  Radio,
  Checkbox,
  Input,
  Progress,
  Space,
  Alert,
  Avatar,
  List,
  Result,
  message,
  Spin,
  Typography,
  Row,
  Col,
  Tag,
} from "antd";
import { AuthContext } from "../config/AuthContext";
import socket from "../socket";
import axios from "../utils/axios";
import { PlayCircleOutlined } from "@ant-design/icons";
import Leaderboard from "./Leaderboard"; // Import the Leaderboard component

const { Title } = Typography;

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

      console.log("=== Quiz Data Debug ===");
      console.log("Quiz Data:", quizData);
      console.log("Current username:", auth.username);
      console.log("Quiz creatorName:", quizData.creatorName);
      console.log("Is creator?", isCreatorStatus);

      setQuiz(quizData);
      setQuestions(quizData.questions || []);
      setQuizStarted(quizData.status === "active");
      setIsCreator(isCreatorStatus);

      // If user is creator and quiz has started, show leaderboard view
      if (isCreatorStatus && quizData.status === "active") {
        setShowCreatorLeaderboard(true);
      }

      console.log("Creator status set to:", isCreatorStatus);

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
      console.log("Quiz ended event received", data);

      // Update local state
      setQuizEnded(true);
      setQuiz((prev) => (prev ? { ...prev, status: "completed" } : prev));

      // Store final scores for the leaderboard
      if (data.finalScores) {
        localStorage.setItem(
          `quiz_${code}_final_scores`,
          JSON.stringify(data.finalScores)
        );
      }

      // Store the quiz code for the leaderboard
      localStorage.setItem(`quiz_${code}_code`, code);

      message.info("Quiz has ended. Redirecting to leaderboard...");

      // Redirect to leaderboard
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
      console.log("Quiz started event received", data);
      setQuizStarted(true);

      // If questions are provided in the event, use them
      if (data.questions) {
        setQuestions(data.questions);
        setQuestionIndex(0);

        // Set the time limit for the first question
        const firstQuestionTimeLimit = data.questions[0]?.timeLimit || 30;
        setTimeLeft(firstQuestionTimeLimit);
        setMaxTime(firstQuestionTimeLimit);
      }

      setSubmitted(false);
      setAnswer("");
    });

    socket.on("next-question", (data) => {
      console.log("Next question received", data);

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      if (data.question) {
        setQuestionIndex(data.questionNumber - 1);
        setAnswer("");
        setSubmitted(false);

        // Set the time limit for this question
        const questionTimeLimit = data.question.timeLimit || 30;
        setTimeLeft(questionTimeLimit);
        setMaxTime(questionTimeLimit);
      }
    });

    socket.on("answer-result", (data) => {
      console.log("Answer result received", data);
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

      // Clean up socket listeners
      socket.off("player-joined");
      socket.off("player-left");
      socket.off("player-list");
      socket.off("quiz-started");
      socket.off("quiz-ended");
      socket.off("quiz-error");
      socket.off("next-question");
      socket.off("answer-result");
      socket.off("player-submitted");

      // Clear timer interval when component unmounts
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [code, auth.username, auth.userId, navigate]);

  const handleStart = async () => {
    // Check if current user is the creator
    if (!isCreator || quiz.creatorName !== auth.username) {
      message.error("Only the quiz creator can start the quiz");
      return;
    }

    try {
      // First make the API call to start the quiz
      const response = await axios.post(`/api/quiz/start`, {
        code,
        creatorName: auth.username,
      });

      if (response.data.success) {
        // After successful API call, emit socket event to notify other players
        socket.emit("start-quiz", {
          code,
          userId: auth.userId, // Send userId for creator verification
        });

        // Update local state
        setQuizStarted(true);
        setQuestions(response.data.questions);

        // Set the first question's time limit
        const firstQuestionTimeLimit =
          response.data.questions[0]?.timeLimit || 30;
        setTimeLeft(firstQuestionTimeLimit);
        setMaxTime(firstQuestionTimeLimit);

        // Show leaderboard for creator
        setShowCreatorLeaderboard(true);

        message.success("Quiz started successfully!");
      }
    } catch (error) {
      console.error("Failed to start quiz:", error);
      message.error(error.response?.data?.error || "Failed to start quiz");
    }
  };

  useEffect(() => {
    // Only start timer when quiz is active and not ended
    if (quizStarted && !quizEnded) {
      console.log("Starting timer with", timeLeft, "seconds");

      // Clear any existing timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Create new interval for countdown
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          const newTime = prevTime - 1;

          // When time reaches 0, clear interval and handle time expiration
          if (newTime <= 0) {
            clearInterval(timerRef.current);
            timerRef.current = null;

            // Only the host should advance the question
            if (isCreator) {
              handleQuestionTimeout();
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);

      // Cleanup function
      return () => {
        console.log("Clearing timer interval");
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
      // Use socket to submit answer
      socket.emit("submit-answer", {
        code,
        questionIndex,
        answer: Array.isArray(answer) ? answer.sort().join(",") : answer,
        username: auth.username,
        userId: auth.userId,
      });

      // For fallback, also make the API call
      const response = await axios.post(`/api/quiz/submit-answer`, {
        code,
        userId: auth.userId,
        questionIndex,
        answer: Array.isArray(answer) ? answer.sort().join(",") : answer,
      });

      if (response.data.success) {
        // Update the score with the currentScore from backend
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

        // Don't move to next question here - wait for timer to finish
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
      console.log("Attempting to end quiz with code:", code);

      // First make the API call to end the quiz
      const response = await axios.post(`/api/quiz/${code}/end`, {
        code,
        createdBy: quiz.createdBy, // Using the quiz's createdBy ID for authorization
        userId: auth.userId, // Only used to mark current user in leaderboard
      });

      if (response.data.success) {
        // After successful API call, emit socket event to notify all players
        socket.emit("end-quiz", {
          code,
          createdBy: quiz.createdBy,
          userId: auth.userId,
          finalScores: response.data.leaderboard, // Pass the leaderboard data
        });

        setQuizEnded(true);
        message.success("Quiz ended successfully");

        // Navigate to leaderboard
        setTimeout(() => {
          navigate(`/leaderboard/${code}`);
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to end quiz:", error);

      // Handle specific error cases
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

  const currentQuestion = questions[questionIndex] || {};

  // Add this function to handle question timeout
  const handleQuestionTimeout = async () => {
    // Check if we're at the last question
    if (questionIndex >= questions.length - 1) {
      // If this is the last question, end the quiz
      console.log("Last question completed, ending quiz");
      await handleEndQuiz();
    } else {
      // Move to the next question
      const nextIndex = questionIndex + 1;

      // Emit socket event to move all players to next question
      socket.emit("move-to-next-question", {
        code,
        questionNumber: nextIndex + 1,
        question: questions[nextIndex],
      });

      // Update local state
      setQuestionIndex(nextIndex);
      setAnswer("");
      setSubmitted(false);

      // Set the time limit for the next question
      const nextQuestionTimeLimit = questions[nextIndex]?.timeLimit || 30;
      setTimeLeft(nextQuestionTimeLimit);
      setMaxTime(nextQuestionTimeLimit);
    }
  };

  // If loading, show loading state
  if (loading) {
    return (
      <div className="quiz-container">
        <Card className="quiz-card">
          <div style={{ textAlign: "center", padding: "40px" }}>
            <Spin size="large" />
            <Title level={4} style={{ marginTop: "20px" }}>
              Loading Quiz...
            </Title>
          </div>
        </Card>
      </div>
    );
  }

  // If error, show error state
  if (error) {
    return (
      <div className="quiz-container">
        <Card className="quiz-card">
          <Result
            status="error"
            title="Failed to load quiz"
            subTitle={error}
            extra={[
              <Button
                type="primary"
                key="home"
                onClick={() => navigate("/home")}
              >
                Back Home
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  // If quiz not found
  if (!quiz) {
    return (
      <div className="quiz-container">
        <Card className="quiz-card">
          <Result
            status="404"
            title="Quiz Not Found"
            subTitle="The quiz you're looking for doesn't exist."
            extra={[
              <Button
                type="primary"
                key="home"
                onClick={() => navigate("/home")}
              >
                Back Home
              </Button>,
            ]}
          />
        </Card>
      </div>
    );
  }

  // If creator and quiz has started, show leaderboard
  if (isCreator && quizStarted && showCreatorLeaderboard) {
    return (
      <div className="quiz-container">
        <Card
          className="quiz-card"
          title={
            <Space
              align="center"
              style={{ width: "100%", justifyContent: "space-between" }}
            >
              <Title level={3}>{quiz.title} - Host View</Title>
              {/* End Quiz button removed */}
            </Space>
          }
        >
          {!quizEnded ? (
            <>
              <div className="quiz-progress">
                <Title level={4}>
                  Question {questionIndex + 1} of {questions.length}
                </Title>
                <Progress
                  percent={((questionIndex + 1) / questions.length) * 100}
                  status="active"
                  format={() => `${questionIndex + 1}/${questions.length}`}
                />

                <div className="timer-section">
                  <Progress
                    percent={(timeLeft / maxTime) * 100}
                    status={timeLeft < 5 ? "exception" : "active"}
                    showInfo={false}
                    strokeColor={
                      timeLeft > maxTime * 0.5
                        ? "#52c41a" // green for plenty of time
                        : timeLeft > maxTime * 0.2
                        ? "#faad14" // yellow for medium time
                        : "#f5222d" // red for low time
                    }
                  />
                  <div className="time-display">
                    Time Left:{" "}
                    <span className={timeLeft <= 5 ? "time-critical" : ""}>
                      {timeLeft}s
                    </span>
                  </div>
                </div>

                <Card
                  className="current-question-card"
                  style={{ marginBottom: "20px" }}
                >
                  <Title level={5}>Current Question:</Title>
                  <p>{currentQuestion.text}</p>
                  <p>
                    <strong>Correct Answer:</strong>{" "}
                    {Array.isArray(currentQuestion.correctAnswer)
                      ? currentQuestion.correctAnswer.join(", ")
                      : currentQuestion.correctAnswer}
                  </p>
                </Card>
              </div>

              {/* Use the Leaderboard component with live prop */}
              <Leaderboard code={code} live={true} isCreator={true} />
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "20px" }}>
              <Result
                status="success"
                title="Quiz Completed!"
                subTitle="Redirecting to the final leaderboard..."
              />
            </div>
          )}
        </Card>
      </div>
    );
  }

  const renderCreatorControls = () => {
    // Check if current user is the creator
    if (!isCreator || quiz.creatorName !== auth.username) {
      return null;
    }

    return (
      <div style={{ marginTop: "20px" }}>
        <Alert
          message="Host Controls"
          description={
            players.length < 2
              ? "Please wait for at least 2 players to join before starting the quiz."
              : "You can now start the quiz. All players are ready!"
          }
          type={players.length < 2 ? "warning" : "success"}
          showIcon
          style={{ marginBottom: "20px" }}
        />
        <Button
          type="primary"
          size="large"
          block
          onClick={handleStart}
          disabled={players.length < 2}
          style={{
            height: "50px",
            fontSize: "18px",
            backgroundColor: players.length < 2 ? "#d9d9d9" : "#1890ff",
          }}
          icon={<PlayCircleOutlined />}
        >
          {players.length < 2 ? "Waiting for Players..." : "Start Quiz Now"}
        </Button>
      </div>
    );
  };

  if (!quizStarted) {
    return (
      <div className="quiz-container">
        <Card
          title={
            <Space>
              <Title level={3}>{quiz.title || "Quiz Lobby"}</Title>
              <Tag color="blue">Code: {code}</Tag>
              {auth.userId === quiz.createdBy && (
                <Tag color="gold">You are the host</Tag>
              )}
            </Space>
          }
          className="quiz-card"
          extra={
            <Space>
              <Tag color="cyan">Created by: {quiz.creatorName}</Tag>
              <Avatar.Group maxCount={2}>
                {players.map((player) => (
                  <Avatar key={player.userId}>
                    {player.username?.[0]?.toUpperCase()}
                  </Avatar>
                ))}
              </Avatar.Group>
              <span>Players: {players.length}</span>
            </Space>
          }
        >
          <div className="quiz-lobby">
            {renderCreatorControls()}

            <div className="players-list">
              <Title level={4}>Players in Lobby</Title>
              <List
                dataSource={players}
                renderItem={(player) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar
                          style={{
                            backgroundColor:
                              player.userId === quiz.createdBy
                                ? "#f56a00"
                                : "#1890ff",
                          }}
                        >
                          {player.username?.[0]?.toUpperCase()}
                        </Avatar>
                      }
                      title={
                        <Space>
                          {player.username}
                          {player.userId === auth.userId && (
                            <Tag color="green">You</Tag>
                          )}
                          {player.userId === quiz.createdBy && (
                            <Tag color="orange">Host</Tag>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </div>

            {(!isCreator || auth.userId !== quiz.createdBy) && (
              <Alert
                message="Waiting for host to start the quiz..."
                type="info"
                showIcon
              />
            )}
          </div>
        </Card>
        <Button type="primary" key="home" onClick={() => navigate("/home")}>
          Back to Home
        </Button>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <Card
        className="quiz-card"
        title={
          <Space
            align="center"
            style={{ width: "100%", justifyContent: "space-between" }}
          >
            <Title level={3}>{quiz.title}</Title>
            {/* End Quiz button removed */}
          </Space>
        }
      >
        <div className="quiz-content">
          {quizStarted && !quizEnded && (
            <div className="timer-section">
              <Progress
                percent={(timeLeft / maxTime) * 100}
                status={timeLeft < 5 ? "exception" : "active"}
                showInfo={false}
                strokeColor={
                  timeLeft > maxTime * 0.5
                    ? "#52c41a" // green for plenty of time
                    : timeLeft > maxTime * 0.2
                    ? "#faad14" // yellow for medium time
                    : "#f5222d" // red for low time
                }
              />
              <div className="time-display">
                Time Left:{" "}
                <span className={timeLeft <= 5 ? "time-critical" : ""}>
                  {timeLeft}s
                </span>
              </div>
            </div>
          )}

          <div className="question-card">
            <div className="question-header">
              <Title level={4}>
                Question {questionIndex + 1} of {questions.length}
              </Title>
              <Title level={3}>{currentQuestion.text}</Title>
            </div>

            {currentQuestion.type === "single" && (
              <Radio.Group
                onChange={(e) => setAnswer(e.target.value)}
                value={answer}
                disabled={submitted}
                className="options-container"
              >
                {currentQuestion.options?.map((opt, idx) => (
                  <Radio key={idx} value={opt}>
                    <Card
                      hoverable={!submitted}
                      className={`option-card ${
                        answer === opt ? "selected" : ""
                      }`}
                    >
                      {opt}
                    </Card>
                  </Radio>
                ))}
              </Radio.Group>
            )}

            {currentQuestion.type === "multiple" && (
              <Checkbox.Group
                onChange={setAnswer}
                value={answer}
                disabled={submitted}
                className="options-container"
              >
                {currentQuestion.options?.map((opt, idx) => (
                  <Checkbox key={idx} value={opt}>
                    <Card
                      hoverable={!submitted}
                      className={`option-card ${
                        answer?.includes(opt) ? "selected" : ""
                      }`}
                    >
                      {opt}
                    </Card>
                  </Checkbox>
                ))}
              </Checkbox.Group>
            )}
          </div>

          <div className="submit-section">
            {submitted ? (
              <Alert
                message="Answer Submitted"
                description="Waiting for the timer to complete. The next question will appear automatically."
                type="success"
                showIcon
              />
            ) : (
              <Button
                type="primary"
                size="large"
                onClick={handleSubmit}
                disabled={
                  !answer || (Array.isArray(answer) && answer.length === 0)
                }
                loading={loading}
              >
                Submit Answer
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QuizRoom;
