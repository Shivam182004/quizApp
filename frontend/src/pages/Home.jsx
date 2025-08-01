import React, { useContext } from "react";
import { Button, Card } from "antd";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../config/AuthContext";

const Home = () => {
  const navigate = useNavigate();
  const { setAuth } = useContext(AuthContext);
  const handleLogout = () => {
    setAuth({
      token: null,
      username: null,
      userId: null,
    });
    localStorage.removeItem("auth");
    navigate("/");
  };

  return (
    <div className="home-container">
      <h2>Welcome to QuizzyPop</h2>
      <div className="mb-5">
        <Button className="text-white bg-danger" onClick={handleLogout}>
          Logout
        </Button>
      </div>

      <div className="home-options">
        <div className="row g-4">
          <div className="col-md-6">
            <Card title="Create Quiz" bordered>
              <p>Create a quiz and share with others.</p>
              <Button type="primary" onClick={() => navigate("/create")}>
                Create
              </Button>
            </Card>
          </div>
          <div className="col-md-6">
            <Card title="Join Quiz" bordered>
              <p>Join a quiz using code provided by host.</p>
              <Button onClick={() => navigate("/join")}>Join</Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
