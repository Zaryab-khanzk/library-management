// Import packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Create server (useful for APIs)
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/library')
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Book schema & model
const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  year: Number,
  available: Boolean,
});
const Book = mongoose.model('Book', bookSchema);

// Admin schema & model
const adminSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true }, // hash before saving!
});
const Admin = mongoose.model('Admin', adminSchema);

// Admin registration route
app.post('/api/admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    // Check if username exists
    const exists = await Admin.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: "Username already exists" });
    }
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();
    res.json({ message: "Admin registered!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Book CRUD endpoints
app.get('/api/books', async (req, res) => {
  const books = await Book.find();
  res.json(books);
});

app.post('/api/books', async (req, res) => {
  const book = new Book(req.body);
  await book.save();
  res.json(book);
});

app.put('/api/books/:id', async (req, res) => {
  const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(book);
});

app.delete('/api/books/:id', async (req, res) => {
  await Book.findByIdAndDelete(req.params.id);
  res.json({ message: "Book deleted" });
});

app.listen(3000, () => console.log("Server started at http://localhost:3000"));