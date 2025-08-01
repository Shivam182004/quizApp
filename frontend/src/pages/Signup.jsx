import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Input, Button, Card, message } from "antd";
import axios from "axios";

const Signup = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (values) => {
    setLoading(true);
    try {
      // Remove confirmPassword before sending to API
      const { confirmPassword, ...signupData } = values;
      
      // Add headers to the request
      const config = {
        headers: {
          'Content-Type': 'application/json',
        }
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/signup`,
        signupData,
        config
      );
      
      if (response.data) {
        message.success("Signup successful! Please login.");
        navigate("/");
      }
    } catch (error) {
      console.error("Signup error:", error);
      // More detailed error handling
      if (error.response) {
        // Server responded with an error
        message.error(error.response.data.message || "Signup failed! Please try again.");
        console.log("Error response:", error.response.data);
      } else if (error.request) {
        // Request was made but no response
        message.error("No response from server. Please try again later.");
        console.log("Error request:", error.request);
      } else {
        // Something else went wrong
        message.error("An error occurred. Please try again.");
        console.log("Error:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <Card title="Signup for Quiz Board" className="auth-card">
        <Form 
          layout="vertical" 
          onFinish={handleSignup}
          validateTrigger="onBlur"
        >
          <Form.Item 
            name="username" 
            label="Username" 
            rules={[
              { required: true, message: "Please enter your username!" },
              { min: 3, message: "Username must be at least 3 characters!" }
            ]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item 
            name="email" 
            label="Email" 
            rules={[
              { required: true, message: "Please enter your email!" },
              { type: "email", message: "Please enter a valid email!" }
            ]}
          >
            <Input />
          </Form.Item>
          
          <Form.Item 
            name="password" 
            label="Password" 
            rules={[
              { required: true, message: "Please enter your password!" },
              { min: 6, message: "Password must be at least 6 characters!" }
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item 
            name="confirmPassword" 
            label="Confirm Password" 
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
            <Input.Password />
          </Form.Item>

          <Button 
            type="primary" 
            htmlType="submit" 
            block 
            loading={loading}
          >
            Signup
          </Button>
        </Form>
        <div className="auth-footer">
          Already have an account? <a href="/">Login</a>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
