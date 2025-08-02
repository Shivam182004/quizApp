import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, message, Typography, Divider } from "antd";
import { motion } from "framer-motion";
import { UserOutlined, MailOutlined, LockOutlined, ArrowRightOutlined } from "@ant-design/icons";
import axios from "axios";

const { Title, Text } = Typography;

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const handleSignup = async (values) => {
    setLoading(true);
    try {
      const { confirmPassword, ...signupData } = values;
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/signup`,
        signupData,
        {
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
      
      if (response.data) {
        message.success("Signup successful! Please login.");
        navigate("/");
      }
    } catch (error) {
      console.error("Signup error:", error);
      if (error.response) {
        message.error(error.response.data.message || "Signup failed! Please try again.");
      } else if (error.request) {
        message.error("No response from server. Please try again later.");
      } else {
        message.error("An error occurred. Please try again.");
      }
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
              <UserOutlined className="text-white text-4xl mb-3" />
              <Title level={3} className="text-white m-0">Create Account</Title>
            </div>
          }
        >
          <div className="p-6">
            <Form form={form} layout="vertical" onFinish={handleSignup} validateTrigger="onBlur">
              <Form.Item 
                name="username" 
                label={<Text className="text-gray-700 font-medium">Username</Text>}
                rules={[
                  { required: true, message: "Please enter your username!" },
                  { min: 3, message: "Username must be at least 3 characters!" }
                ]}
              >
                <Input 
                  prefix={<UserOutlined className="text-gray-400" />} 
                  placeholder="Enter username" 
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>
              
              <Form.Item 
                name="email" 
                label={<Text className="text-gray-700 font-medium">Email</Text>}
                rules={[
                  { required: true, message: "Please enter your email!" },
                  { type: "email", message: "Please enter a valid email!" }
                ]}
              >
                <Input 
                  prefix={<MailOutlined className="text-gray-400" />} 
                  placeholder="Enter email" 
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>
              
              <Form.Item 
                name="password" 
                label={<Text className="text-gray-700 font-medium">Password</Text>}
                rules={[
                  { required: true, message: "Please enter your password!" },
                  { min: 6, message: "Password must be at least 6 characters!" }
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined className="text-gray-400" />} 
                  placeholder="Enter password" 
                  size="large"
                  className="rounded-lg"
                />
              </Form.Item>

              <Form.Item 
                name="confirmPassword" 
                label={<Text className="text-gray-700 font-medium">Confirm Password</Text>}
                dependencies={['password']}
                rules={[
                  { required: true, message: "Please confirm your password!" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Passwords do not match!'));
                    },
                  }),
                ]}
              >
                <Input.Password 
                  prefix={<LockOutlined className="text-gray-400" />} 
                  placeholder="Confirm password" 
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
                    icon={<ArrowRightOutlined />}
                  >
                    Sign Up
                  </Button>
                </motion.div>
              </Form.Item>
            </Form>

            <Divider>or</Divider>

            <div className="text-center">
              <Text className="text-gray-600">
                Already have an account?{' '}
                <a 
                  href="/" 
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Login
                </a>
              </Text>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default Signup;