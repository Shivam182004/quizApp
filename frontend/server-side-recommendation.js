// Server-side socket handler (recommendation)
socket.on("end-quiz", (data) => {
  const { code, createdBy, userId, finalScores } = data;
  
  // Broadcast to all clients in the room that the quiz has ended
  io.to(code).emit("quiz-ended", {
    code,
    createdBy,
    userId,
    finalScores
  });
  
  // Update quiz status in database to 'completed'
  // This would be handled by your server-side code
});