import React, { useState, useContext } from "react";
import { Form, Input, Select, Button, Card, message, Space, Modal, Tag } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../config/AuthContext";
import { PlusOutlined, DeleteOutlined, CloseOutlined, CheckOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";

const { Option } = Select;
const { TextArea } = Input;

const CreateQuiz = () => {
  const [loading, setLoading] = useState(false);
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [questionForm] = Form.useForm();
  const [form] = Form.useForm();

  const handleCreate = async (values) => {
    if (questions.length === 0) {
      message.error("Please add at least one question");
      return;
    }

    if (!auth.userId) {
      message.error("User ID not found. Please try logging in again.");
      return;
    }

    setLoading(true);
    try {
      const creatorId = `creator_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const quizData = {
        title: values.title,
        category: values.category,
        questions: questions.map((q) => ({
          text: q.text,
          type: q.type,
          options: q.options || [],
          correctAnswer: q.correctAnswer,
          timeLimit: q.timeLimit || 30,
        })),
        userId: auth.userId,
        createdBy: creatorId,
        creatorName: auth.username,
        isCreator: true,
      };

      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/quiz/create`,
        quizData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

      if (res.data && res.data.code) {
        localStorage.setItem(`quiz_${res.data.code}_creator`, creatorId);
        message.success("Quiz Created! Share this code: " + res.data.code);
        navigate(`/quiz/${res.data.code}`);
      }
    } catch (err) {
      console.error("Quiz creation error:", err);
      message.error(
        err.response?.data?.error || "Failed to create quiz. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const showQuestionModal = () => {
    setIsModalVisible(true);
    questionForm.resetFields();
  };

  const handleQuestionSubmit = () => {
    questionForm.validateFields().then((values) => {
      if (
        values.type !== "text" &&
        (!values.options || values.options.length < 2)
      ) {
        message.error("Please add at least 2 options for choice-based questions");
        return;
      }

      if (
        values.type !== "text" &&
        values.options &&
        !values.options.includes(values.correctAnswer)
      ) {
        message.error("Correct answer must match one of the options");
        return;
      }

      const newQuestion = {
        text: values.questionText,
        type: values.type,
        options:
          values.type === "text"
            ? []
            : values.options.filter((opt) => opt.trim() !== ""),
        correctAnswer: values.correctAnswer,
      };

      setQuestions((prev) => [...prev, newQuestion]);
      setIsModalVisible(false);
      questionForm.resetFields();
      message.success("Question added successfully");
    });
  };

  const removeQuestion = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuestionTypeChange = (type) => {
    questionForm.setFieldsValue({
      options: type === "text" ? [] : ["", ""],
      correctAnswer: "",
    });
  };

  const questionTypeColors = {
    single: "blue",
    mcq: "purple",
    text: "green"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-4xl mx-auto"
      >
        <Card
          title={
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-800">Create New Quiz</h1>
            </div>
          }
          className="shadow-lg border-0 rounded-xl overflow-hidden"
          headStyle={{ borderBottom: '1px solid #e8e8e8' }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
            initialValues={{ category: "technology" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Form.Item
                name="title"
                label={<span className="text-gray-700 font-medium">Quiz Title</span>}
                rules={[{ required: true, message: "Please enter quiz title" }]}
              >
                <Input 
                  placeholder="Enter quiz title" 
                  className="h-12 rounded-lg border-gray-300 hover:border-blue-400 focus:border-blue-500"
                />
              </Form.Item>

              <Form.Item
                name="category"
                label={<span className="text-gray-700 font-medium">Category</span>}
                rules={[{ required: true, message: "Please select a category" }]}
              >
                <Select className="h-12 rounded-lg">
                  <Option value="technology">Technology</Option>
                  <Option value="science">Science</Option>
                  <Option value="college">College Subjects</Option>
                  <Option value="history">History</Option>
                  <Option value="general">General Knowledge</Option>
                </Select>
              </Form.Item>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Questions ({questions.length})</h3>
                <Button
                  type="primary"
                  onClick={showQuestionModal}
                  icon={<PlusOutlined />}
                  className="flex items-center bg-blue-600 hover:bg-blue-700 border-none"
                >
                  Add Question
                </Button>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-gray-500">No questions added yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card
                        size="small"
                        className="border-0 shadow-sm hover:shadow-md transition-shadow"
                        extra={
                          <Button
                            type="text"
                            danger
                            icon={<CloseOutlined />}
                            onClick={() => removeQuestion(index)}
                            className="text-red-500 hover:text-red-700"
                          />
                        }
                      >
                        <div className="flex items-start gap-4">
                          <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-medium">
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="font-medium text-gray-800">{q.text}</h4>
                              <Tag color={questionTypeColors[q.type]} className="capitalize">
                                {q.type}
                              </Tag>
                            </div>
                            
                            {q.options.length > 0 && (
                              <div className="mt-2">
                                <h5 className="text-sm font-medium text-gray-600 mb-1">Options:</h5>
                                <div className="flex flex-wrap gap-2">
                                  {q.options.map((opt, i) => (
                                    <Tag 
                                      key={i} 
                                      color={opt === q.correctAnswer ? "green" : "default"}
                                      icon={opt === q.correctAnswer ? <CheckOutlined /> : null}
                                      className="flex items-center gap-1"
                                    >
                                      {opt}
                                    </Tag>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                disabled={questions.length === 0}
                className="h-12 px-8 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-none shadow-md"
              >
                {loading ? 'Creating...' : 'Create Quiz'}
              </Button>
            </div>
          </Form>

          <Modal
            title={<span className="text-xl font-semibold text-gray-800">Add Question</span>}
            open={isModalVisible}
            onOk={handleQuestionSubmit}
            onCancel={() => setIsModalVisible(false)}
            width={700}
            footer={[
              <Button key="back" onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>,
              <Button 
                key="submit" 
                type="primary" 
                onClick={handleQuestionSubmit}
                className="bg-blue-600 hover:bg-blue-700 border-none"
              >
                Add Question
              </Button>,
            ]}
          >
            <Form form={questionForm} layout="vertical" className="pt-4">
              <Form.Item
                name="questionText"
                label={<span className="text-gray-700 font-medium">Question Text</span>}
                rules={[{ required: true, message: "Please enter the question" }]}
              >
                <TextArea 
                  rows={3} 
                  placeholder="Enter your question here" 
                  className="rounded-lg border-gray-300 hover:border-blue-400 focus:border-blue-500"
                />
              </Form.Item>

              <Form.Item
                name="type"
                label={<span className="text-gray-700 font-medium">Question Type</span>}
                rules={[{ required: true }]}
                initialValue="single"
              >
                <Select 
                  onChange={handleQuestionTypeChange}
                  className="rounded-lg h-10"
                >
                  <Option value="single">Single Choice</Option>
                  <Option value="mcq">Multiple Choice</Option>
                  <Option value="text">Text Answer</Option>
                </Select>
              </Form.Item>

              <Form.Item
                noStyle
                shouldUpdate={(prevValues, currentValues) =>
                  prevValues.type !== currentValues.type
                }
              >
                {({ getFieldValue }) => {
                  const type = getFieldValue("type");
                  if (type === "text") {
                    return (
                      <Form.Item
                        name="correctAnswer"
                        label={<span className="text-gray-700 font-medium">Correct Answer</span>}
                        rules={[
                          {
                            required: true,
                            message: "Please enter the correct answer",
                          },
                        ]}
                      >
                        <Input 
                          placeholder="Enter the correct answer" 
                          className="rounded-lg border-gray-300 hover:border-blue-400 focus:border-blue-500"
                        />
                      </Form.Item>
                    );
                  }
                  return (
                    <>
                      <Form.List
                        name="options"
                        initialValue={["", ""]}
                        rules={[
                          {
                            validator: async (_, options) => {
                              if (
                                !options ||
                                options.filter((opt) => opt.trim() !== "")
                                  .length < 2
                              ) {
                                throw new Error(
                                  "At least 2 options are required"
                                );
                              }
                            },
                          },
                        ]}
                      >
                        {(fields, { add, remove }) => (
                          <>
                            <div className="mb-2">
                              <span className="text-gray-700 font-medium">Options</span>
                            </div>
                            <div className="space-y-3">
                              {fields.map((field, index) => (
                                <div key={field.key} className="flex items-center gap-2">
                                  <Form.Item
                                    name={field.name}
                                    validateTrigger={["onChange", "onBlur"]}
                                    rules={[
                                      {
                                        required: true,
                                        whitespace: true,
                                        message: "Please input option's content or delete this field.",
                                      },
                                    ]}
                                    noStyle
                                  >
                                    <Input
                                      placeholder={`Option ${index + 1}`}
                                      className="flex-1 rounded-lg border-gray-300 hover:border-blue-400 focus:border-blue-500"
                                    />
                                  </Form.Item>
                                  {fields.length > 2 && (
                                    <Button
                                      type="text"
                                      danger
                                      icon={<CloseOutlined />}
                                      onClick={() => remove(field.name)}
                                      className="text-red-500 hover:text-red-700"
                                    />
                                  )}
                                </div>
                              ))}
                              {fields.length < 6 && (
                                <Button
                                  type="dashed"
                                  onClick={() => add()}
                                  icon={<PlusOutlined />}
                                  block
                                  className="rounded-lg border-gray-300 hover:border-blue-400"
                                >
                                  Add Option
                                </Button>
                              )}
                            </div>
                          </>
                        )}
                      </Form.List>
                      <Form.Item
                        name="correctAnswer"
                        label={<span className="text-gray-700 font-medium">Correct Answer</span>}
                        rules={[
                          {
                            required: true,
                            message: "Please enter the correct answer",
                          },
                        ]}
                      >
                        <Input 
                          placeholder="Enter the correct option exactly as written above" 
                          className="rounded-lg border-gray-300 hover:border-blue-400 focus:border-blue-500"
                        />
                      </Form.Item>
                    </>
                  );
                }}
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      </motion.div>
    </div>
  );
};

export default CreateQuiz;