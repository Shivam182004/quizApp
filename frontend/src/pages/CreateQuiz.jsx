import React, { useState, useContext } from "react";
import { Form, Input, Select, Button, Card, message, Space, Modal } from "antd";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../config/AuthContext";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";

const { Option } = Select;
const { TextArea } = Input;

const CreateQuiz = () => {
  const [loading, setLoading] = useState(false);
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [questionForm] = Form.useForm();
  const [form] = Form.useForm(); // Add main form instance

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
      // Generate a unique creator ID
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
      // Validate options for choice-based questions
      if (
        values.type !== "text" &&
        (!values.options || values.options.length < 2)
      ) {
        message.error(
          "Please add at least 2 options for choice-based questions"
        );
        return;
      }

      // Validate correct answer for choice-based questions
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

  // Initialize form with 2 default options when selecting choice-based questions
  const handleQuestionTypeChange = (type) => {
    questionForm.setFieldsValue({
      options: type === "text" ? [] : ["", ""],
      correctAnswer: "",
    });
  };

  return (
    <div className="">
      <div className="auth-container">
        <Card title="Create New Quiz" className="auth-card">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
            initialValues={{
              category: "technology", // Set default category
            }}
          >
            <Form.Item
              name="title"
              label="Quiz Title"
              rules={[{ required: true, message: "Please enter quiz title" }]}
            >
              <Input placeholder="Enter quiz title" />
            </Form.Item>

            <Form.Item
              name="category"
              label="Category"
              rules={[{ required: true, message: "Please select a category" }]}
            >
              <Select>
                <Option value="technology">Technology</Option>
                <Option value="science">Science</Option>
                <Option value="college">College Subjects</Option>
              </Select>
            </Form.Item>

            <div style={{ marginBottom: 16 }}>
              <h3>Questions ({questions.length})</h3>
              {questions.map((q, index) => (
                <Card
                  key={index}
                  size="small"
                  style={{ marginBottom: 8 }}
                  extra={
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => removeQuestion(index)}
                    />
                  }
                >
                  <p>
                    <strong>Question {index + 1}:</strong> {q.text}
                  </p>
                  <p>
                    <strong>Type:</strong> {q.type}
                  </p>
                  {q.options.length > 0 && (
                    <p>
                      <strong>Options:</strong> {q.options.join(", ")}
                    </p>
                  )}
                  <p>
                    <strong>Correct Answer:</strong> {q.correctAnswer}
                  </p>
                </Card>
              ))}
              <Button
                type="dashed"
                onClick={showQuestionModal}
                block
                icon={<PlusOutlined />}
              >
                Add Question
              </Button>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              disabled={questions.length === 0}
            >
              Create Quiz
            </Button>
          </Form>

          <Modal
            title="Add Question"
            open={isModalVisible}
            onOk={handleQuestionSubmit}
            onCancel={() => setIsModalVisible(false)}
            width={600}
          >
            <Form form={questionForm} layout="vertical">
              <Form.Item
                name="questionText"
                label="Question Text"
                rules={[
                  { required: true, message: "Please enter the question" },
                ]}
              >
                <TextArea rows={3} placeholder="Enter your question here" />
              </Form.Item>

              <Form.Item
                name="type"
                label="Question Type"
                rules={[{ required: true }]}
                initialValue="single"
              >
                <Select onChange={handleQuestionTypeChange}>
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
                        label="Correct Answer"
                        rules={[
                          {
                            required: true,
                            message: "Please enter the correct answer",
                          },
                        ]}
                      >
                        <Input placeholder="Enter the correct answer" />
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
                            {fields.map((field, index) => (
                              <Form.Item
                                key={field.key}
                                label={index === 0 ? "Options" : ""}
                                required={false}
                              >
                                <Space>
                                  <Form.Item
                                    name={field.name}
                                    validateTrigger={["onChange", "onBlur"]}
                                    rules={[
                                      {
                                        required: true,
                                        whitespace: true,
                                        message:
                                          "Please input option's content or delete this field.",
                                      },
                                    ]}
                                    noStyle
                                  >
                                    <Input
                                      placeholder={`Option ${index + 1}`}
                                      style={{ width: "300px" }}
                                    />
                                  </Form.Item>
                                  {fields.length > 2 && (
                                    <DeleteOutlined
                                      onClick={() => remove(field.name)}
                                    />
                                  )}
                                </Space>
                              </Form.Item>
                            ))}
                            {fields.length < 6 && (
                              <Form.Item>
                                <Button
                                  type="dashed"
                                  onClick={() => add()}
                                  icon={<PlusOutlined />}
                                  block
                                >
                                  Add Option
                                </Button>
                              </Form.Item>
                            )}
                          </>
                        )}
                      </Form.List>
                      <Form.Item
                        name="correctAnswer"
                        label="Correct Answer"
                        rules={[
                          {
                            required: true,
                            message: "Please enter the correct answer",
                          },
                        ]}
                      >
                        <Input placeholder="Enter the correct option exactly as written above" />
                      </Form.Item>
                    </>
                  );
                }}
              </Form.Item>
            </Form>
          </Modal>
        </Card>
      </div>
    </div>
  );
};

export default CreateQuiz;
