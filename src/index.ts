import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

app.get("/", (req, res) => {
  res.send("API is running");
});

// app.get("/hello", (req, res) => {
//   res.send("Hello Express 🚀");
// });

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});