// Import packages
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

// Create server (useful for APIs)
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

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
  password: { type: String, required: true }
});
const Admin = mongoose.model('Admin', adminSchema);

// User schema & model (with embedded borrow documents referencing `Book`)
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  name: String,
  borrowed: [{
    book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' },
    borrowDate: Date,
    dueDate: Date,
    returned: { type: Boolean, default: false },
    returnDate: Date
  }]
});
const User = mongoose.model('User', userSchema);

// Admin registration (POSTMAN ONLY, not in frontend)
app.post('/api/admin', async (req, res) => {
  try {
    const { username, password } = req.body;
    const exists = await Admin.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: "Username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newAdmin = new Admin({ username, password: hashedPassword });
    await newAdmin.save();
    res.json({ message: "Admin registered!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin login (for frontend)
app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username });
    if (!admin) return res.status(400).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    // Simple text response (no token/session)
    res.json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User registration
app.post('/api/users', async (req, res) => {
  try {
    const { username, password, name } = req.body;
    const exists = await User.findOne({ username });
    if (exists) {
      return res.status(400).json({ error: "Username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword, name });
    await newUser.save();
    res.json({ message: "User registered!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User login
app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });
    res.json({ message: "Login successful", user: { id: user._id, username: user.username, name: user.name } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user (with borrowed books populated)
app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('borrowed.book');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Borrow a book (embed a borrow doc in the User, reference the Book)
app.post('/api/users/:id/borrow', async (req, res) => {
  try {
    const { bookId } = req.body;
    const user = await User.findById(req.params.id);
    const book = await Book.findById(bookId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    if (!book.available) return res.status(400).json({ error: 'Book not available' });
    // mark book unavailable
    book.available = false;
    await book.save();
    // add borrow entry to user (embedded) referencing the book
    user.borrowed.push({
      book: book._id,
      borrowDate: new Date(),
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      returned: false
    });
    await user.save();
    const populated = await User.findById(user._id).populate('borrowed.book');
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Return a borrowed book
app.post('/api/users/:id/return', async (req, res) => {
  try {
    const { bookId } = req.body;
    const user = await User.findById(req.params.id);
    const book = await Book.findById(bookId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!book) return res.status(404).json({ error: 'Book not found' });
    const entry = user.borrowed.find(b => String(b.book) === String(book._id) && !b.returned);
    if (!entry) return res.status(400).json({ error: 'No active borrow found for this book' });
    entry.returned = true;
    entry.returnDate = new Date();
    book.available = true;
    await book.save();
    await user.save();
    res.json({ message: 'Book returned' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Debug endpoint (development only): list admins
// Remove this in production. Helps verify stored usernames during troubleshooting.
app.get('/api/debug/admins', async (req, res) => {
  try {
    const admins = await Admin.find({}, 'username');
    res.json(admins);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all books
app.get('/api/books', async (req, res) => {
  try {
    const books = await Book.find();
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add book
app.post('/api/books', async (req, res) => {
  try {
    const book = new Book(req.body);
    await book.save();
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update book
app.put('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete book
app.delete('/api/books/:id', async (req, res) => {
  try {
    await Book.findByIdAndDelete(req.params.id);
    res.json({ message: "Book deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(3000, () => console.log("Server started at http://localhost:3000"));