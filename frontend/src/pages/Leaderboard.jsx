  import React, { useEffect, useState, useContext } from "react";
  import { useParams, useNavigate } from "react-router-dom";
  import axios from "../utils/axios";
  import { Table, Card, Button, message, Typography, Tag, Result, Space, Statistic, Row, Col } from "antd";
  import { AuthContext } from "../config/AuthContext";
  import socket from "../socket"; // Correct import path

  const { Title } = Typography;

  const Leaderboard = ({ code: propCode, live, isCreator }) => {
    const { code: paramCode } = useParams();
    const code = propCode || paramCode; // Use prop if provided, otherwise use URL param
    
    const [leaderboardData, setLeaderboardData] = useState({
      quiz: {},
      leaderboard: [],
      submissionHistory: [],
      metadata: {}
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const { auth } = useContext(AuthContext);

    useEffect(() => {
      const fetchScores = async () => {
        try {
          const res = await axios.get(`/api/quiz/leaderboard/${code}${live ? '?live=true' : ''}`);
          
          if (res.data.success) {
            setLeaderboardData({
              quiz: res.data.quiz,
              leaderboard: res.data.leaderboard,
              submissionHistory: res.data.submissionHistory,
              metadata: res.data.metadata
            });
            setError(null);
          } else {
            throw new Error(res.data.error || "Failed to fetch leaderboard");
          }
        } catch (error) {
          console.error("Error fetching leaderboard:", error);
          setError(error.response?.data?.error || "Failed to fetch leaderboard");
          message.error(error.response?.data?.error || "Failed to fetch leaderboard");
        } finally {
          setLoading(false);
        }
      };

      fetchScores();
      
      // Set up polling for live leaderboard
      let interval;
      if (live) {
        interval = setInterval(fetchScores, 3000); // Update every 3 seconds
        
        // Listen for socket events for real-time updates
        socket.on("player-submitted", () => {
          fetchScores();
        });
        
        socket.on("answer-result", () => {
          fetchScores();
        });
      }
      
      return () => {
        if (interval) clearInterval(interval);
        if (live) {
          socket.off("player-submitted");
          socket.off("answer-result");
        }
      };
    }, [code, live]);

    const columns = [
      { 
        title: "Rank", 
        dataIndex: "rank", 
        key: "rank",
        width: '15%',
        render: (rank) => (
          <Tag color={rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : 'default'}>
            #{rank}
          </Tag>
        )
      },
      { 
        title: "Player", 
        dataIndex: "username",
        key: "username",
        width: '35%',
        render: (username, record) => (
          <Space>
            {username}
            {record.userId === auth.userId && <Tag color="green">You</Tag>}
          </Space>
        )
      },
      { 
        title: "Score", 
        dataIndex: "score", 
        key: "score",
        width: '25%',
        render: (score) => (
          <Tag color="blue">{score} points</Tag>
        )
      },
      {
        title: live ? "Status" : "Percentage",
        dataIndex: live ? "status" : "percentage",
        key: live ? "status" : "percentage",
        width: '25%',
        render: (value, record) => (
          live ? 
            <Tag color={record.submitted ? 'green' : 'orange'}>
              {record.submitted ? 'Submitted' : 'Answering...'}
            </Tag>
          :
            <Tag color={value >= 70 ? 'green' : value >= 40 ? 'orange' : 'red'}>
              {value}%
            </Tag>
        )
      }
    ];

    if (loading) {
      return (
        <div className={!propCode ? "auth-container" : ""}>
          <Card loading={true} className={!propCode ? "auth-card" : ""}>
            Loading...
          </Card>
        </div>
      );
    }

    if (error) {
      return (
        <div className={!propCode ? "auth-container" : ""}>
          <Card className={!propCode ? "auth-card" : ""}>
            <Result
              status="error"
              title="Failed to load leaderboard"
              subTitle={error}
              extra={[
                <Button type="primary" key="home" onClick={() => navigate('/home')}>
                  Back to Home
                </Button>
              ]}
            />
          </Card>
        </div>
      );
    }

    // If this is a live leaderboard embedded in another component
    if (propCode) {
      return (
        <div className="live-leaderboard">
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic 
                title="Average Score" 
                value={Math.round(leaderboardData.metadata.averageScore * 10) / 10 || 0}
                suffix="points"
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Highest Score" 
                value={leaderboardData.metadata.highestScore || 0}
                suffix="points"
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Total Participants" 
                value={leaderboardData.leaderboard?.length || 0}
              />
            </Col>
          </Row>

          {leaderboardData.leaderboard?.length > 0 ? (
            <Table 
              dataSource={leaderboardData.leaderboard.map((player, index) => ({
                ...player,
                rank: index + 1,
                key: player.userId
              }))} 
              columns={columns} 
              pagination={false} 
              loading={loading}
              rowKey="userId"
              className="leaderboard-table"
            />
          ) : (
            <Result
              status="info"
              title="No Results Yet"
              subTitle="The leaderboard is currently empty. Please wait for participants to submit answers."
            />
          )}
          
          {isCreator && live && (
            <div style={{ marginTop: "20px", textAlign: "center" }}>
              <p>As the quiz host, you're seeing the live leaderboard. Participants are seeing the quiz questions.</p>
            </div>
          )}
        </div>
      );
    }

    // Full page leaderboard (after quiz ends)
    return (
      <div className="auth-container">
        <Card 
          title={
            <div>
              <Title level={3}>{leaderboardData.quiz.title || 'Quiz Leaderboard'}</Title>
              <Title level={5}>
                Quiz Code: <Tag color="cyan">{code}</Tag>
                {leaderboardData.quiz.category && (
                  <Tag color="purple" style={{ marginLeft: 8 }}>{leaderboardData.quiz.category}</Tag>
                )}
              </Title>
              <Tag color={leaderboardData.quiz.status === 'completed' ? 'green' : 'blue'}>
                {leaderboardData.quiz.status?.charAt(0).toUpperCase() + leaderboardData.quiz.status?.slice(1)}
              </Tag>
            </div>
          } 
          className="auth-card"
        >
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic 
                title="Average Score" 
                value={Math.round(leaderboardData.metadata.averageScore * 10) / 10 || 0}
                suffix="points"
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Highest Score" 
                value={leaderboardData.metadata.highestScore || 0}
                suffix="points"
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="Total Participants" 
                value={leaderboardData.quiz.totalParticipants || leaderboardData.leaderboard?.length || 0}
              />
            </Col>
          </Row>

          {leaderboardData.leaderboard?.length > 0 ? (
            <Table 
              dataSource={leaderboardData.leaderboard.map((player, index) => ({
                ...player,
                rank: index + 1,
                key: player.userId
              }))} 
              columns={columns} 
              pagination={false} 
              loading={loading}
              rowKey="userId"
              className="leaderboard-table"
            />
          ) : (
            <Result
              status="info"
              title="No Results Yet"
              subTitle="The leaderboard is currently empty. Please wait for the quiz to complete."
            />
          )}
          
          <div style={{ marginTop: "20px", textAlign: "center" }}>
            <Button 
              type="primary" 
              onClick={() => navigate("/home")}
              size="large"
            >
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  export default Leaderboard;
