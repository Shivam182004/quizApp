import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, message, Typography, Divider } from "antd";
import { motion } from "framer-motion";
import { LockOutlined, MailOutlined, LoginOutlined } from "@ant-design/icons";
import axios from "axios";
import { AuthContext } from "../config/AuthContext";

const { Title, Text } = Typography;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const { setAuth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, values);
      
      let userId = res.data.userId;
      if (!userId && res.data.token) {
        const tokenParts = res.data.token.split('.');
        const payload = JSON.parse(atob(tokenParts[1]));
        userId = payload.userId;
      }

      setAuth({
        token: res.data.token,
        username: res.data.username,
        userId: userId
      });

      localStorage.setItem('auth', JSON.stringify({
        token: res.data.token,
        username: res.data.username,
        userId: userId
      }));

      message.success("Login successful!");
      navigate("/home");
    } catch (error) {
      console.error("Login error:", error);
      message.error(error.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
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
              <LockOutlined className="text-white text-4xl mb-3" />
              <Title level={3} className="text-white m-0">Welcome Back</Title>
            </div>
          }
        >
          <div className="p-6">
            <Form form={form} layout="vertical" onFinish={handleLogin}>
              <Form.Item 
                name="email" 
                label={<Text className="text-gray-700 font-medium">Email</Text>}
                rules={[{ required: true, message: 'Please input your email!' }]}
              >
                <Input 
                  prefix={<MailOutlined className="text-gray-400" />} 
                  placeholder="Enter your email" 
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label={<Text className="text-gray-700 font-medium">Password</Text>}
                rules={[{ required: true, message: 'Please input your password!' }]}
              >
                <Input.Password 
                  prefix={<LockOutlined className="text-gray-400" />} 
                  placeholder="Enter your password" 
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item>
                <motion.div whileHover={{ scale: 1.02 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    block
                    size="large"
                    className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none"
                    icon={<LoginOutlined />}
                  >
                    Login
                  </Button>
                </motion.div>
              </Form.Item>
            </Form>

            <Divider>or</Divider>

            <div className="text-center">
              <Text className="text-gray-600">
                Don't have an account?{' '}
                <a 
                  href="/signup" 
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign up
                </a>
              </Text>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;