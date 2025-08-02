import React, { useContext } from "react";
import { Button, Card } from "antd";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../config/AuthContext";
import { motion } from "framer-motion";
import { Rocket, Users, LogOut } from "lucide-react";

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

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        when: "beforeChildren"
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <motion.div 
      className="max-w-6xl mx-auto p-8 min-h-screen flex flex-col bg-gray-50"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <motion.h1 
          className="text-4xl font-bold text-blue-800"
          variants={itemVariants}
        >
          Welcome to <span className="text-blue-600">QuizzyPop</span>
        </motion.h1>
        
        <motion.div variants={itemVariants}>
          <Button 
            className="text-blue-600 font-medium hover:text-red-500 transition-colors flex items-center gap-2"
            type="text"
            icon={<LogOut className="w-5 h-5" />}
            onClick={handleLogout}
          >
            Sign Out
          </Button>
        </motion.div>
      </div>

      {/* Main Content */}
      <motion.div 
        className="flex-1"
        variants={containerVariants}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 my-8">
          {/* Create Quiz Card */}
          <motion.div 
            className="rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100 bg-white"
            whileHover={{ y: -5 }}
            variants={itemVariants}
          >
            <Card 
              bordered={false}
              cover={
                <div className="flex justify-center items-center py-12 bg-blue-600">
                  <Rocket className="text-white w-16 h-16" strokeWidth={1.5} />
                </div>
              }
            >
              <h3 className="text-xl font-semibold text-blue-800 mb-3">Create Quiz</h3>
              <p className="text-gray-600 mb-6">Design your own interactive quiz and challenge your friends</p>
              <Button 
                type="primary" 
                shape="round" 
                size="large"
                onClick={() => navigate("/create")}
                className="w-full bg-blue-600 hover:bg-blue-700 border-none"
              >
                Get Started
              </Button>
            </Card>
          </motion.div>

          {/* Join Quiz Card */}
          <motion.div 
            className="rounded-xl overflow-hidden shadow-md hover:shadow-lg transition-all duration-300 border border-blue-100 bg-white"
            whileHover={{ y: -5 }}
            variants={itemVariants}
          >
            <Card 
              bordered={false}
              cover={
                <div className="flex justify-center items-center py-12 bg-blue-500">
                  <Users className="text-white w-16 h-16" strokeWidth={1.5} />
                </div>
              }
            >
              <h3 className="text-xl font-semibold text-blue-800 mb-3">Join Quiz</h3>
              <p className="text-gray-600 mb-6">Enter a game code to join an existing quiz session</p>
              <Button 
                type="default" 
                shape="round" 
                size="large"
                onClick={() => navigate("/join")}
                className="w-full border-blue-500 text-blue-600 hover:border-blue-600 hover:text-blue-700"
              >
                Enter Code
              </Button>
            </Card>
          </motion.div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div 
        className="text-center mt-auto pt-8 text-blue-400 italic"
        variants={itemVariants}
      >
        <p>Ready for some quiz fun? Let's get started!</p>
      </motion.div>
    </motion.div>
  );
};

export default Home;