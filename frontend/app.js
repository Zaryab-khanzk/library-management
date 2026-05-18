// ========================================
// Sample Book Data for Demo
// In production, this will be fetched from backend API
// ========================================
const MockStorage = {
  _sampleBooks(){
    return [
      {id:1,title:'1984',author:'George Orwell',year:1949,available:true},
      {id:2,title:'The Hobbit',author:'J.R.R. Tolkien',year:1937,available:false},
      {id:3,title:'Clean Code',author:'Robert C. Martin',year:2008,available:true},
      {id:4,title:'Dune',author:'Frank Herbert',year:1965,available:true}
    ];
  }
};

// ========================================
// Application State
// Session-only (no localStorage for auth)
// ========================================
const state = {
  // Books: fetched from mock data (will be replaced with API call)
  books: MockStorage._sampleBooks(),
  
  // Current logged-in admin (session-only, cleared on page reload)
  // Structure: { username: 'admin@example.com', token?: 'jwt-token' }
  currentAdmin: null
};

// ========================================
// DOM Helpers & Utilities
// ========================================
const el = id => document.getElementById(id);

function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c=> ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#39;"
  }[c]));
}

function nextId(){
  return state.books.length ? Math.max(...state.books.map(b=>b.id)) + 1 : 1;
}

function showNotification(message, type='info', timeout=3000){
  // Show notification in appropriate area based on current page
  const notifyEl = state.currentAdmin ? el('notification-dashboard') : el('notification');
  
  if(notifyEl){
    notifyEl.textContent = message;
    notifyEl.className = `notification ${type}`;
    notifyEl.classList.remove('hidden');
    if(timeout > 0){
      setTimeout(() => notifyEl.classList.add('hidden'), timeout);
    }
  }
}

// ========================================
// Page Navigation
// ========================================
function showLoginPage(){
  el('login-page').classList.remove('hidden');
  el('dashboard').classList.add('hidden');
}

function showDashboard(){
  el('login-page').classList.add('hidden');
  el('dashboard').classList.remove('hidden');
  renderBooks();
  updateAdminInfo();
}

function updateAdminInfo(){
  const adminInfo = el('admin-info');
  if(state.currentAdmin){
    adminInfo.textContent = `Admin: ${state.currentAdmin.username}`;
  }
}

// ========================================
// Authentication: Login & Logout
// ========================================

// TODO: Replace with real API call to backend
// Expected endpoint: POST /api/admin/login
// Body: { username: string, password: string }
// Response: { success: boolean, message: string, token?: string, admin?: { username: string } }
function loginAdmin(username, password){
  // FOR DEMO ONLY: Simple validation
  // In production, this will make an API call to your backend
  
  if(!username || !password){
    showNotification('Please enter both username and password', 'error');
    return false;
  }

  // TODO: REPLACE WITH REAL API CALL
  // Example:
  // const response = await fetch('/api/admin/login', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ username, password })
  // });
  // const result = await response.json();
  // if(!result.success){ showNotification(result.message, 'error'); return false; }
  // state.currentAdmin = { username: result.admin.username, token: result.token };

  // DEMO: Accept any non-empty credentials
  state.currentAdmin = { username: username };
  showNotification(`Welcome, ${username}!`, 'success');
  return true;
}

function logoutAdmin(){
  state.currentAdmin = null;
  el('form-login').reset();
  showNotification('Logged out', 'info');
  showLoginPage();
}

// ========================================
// Book CRUD Operations
// ========================================

// Fetch all books from backend
// TODO: Replace with real API call
// Expected endpoint: GET /api/books
// Response: { books: [{id, title, author, year, available}, ...] }
function fetchBooks(){
  // In production:
  // const response = await fetch('/api/books', {
  //   headers: { 'Authorization': `Bearer ${state.currentAdmin.token}` }
  // });
  // state.books = (await response.json()).books;
  
  // For now, use mock data (already loaded in state.books)
  renderBooks();
}

function renderBooks(){
  if(!state.currentAdmin) return;
  
  const tbody = document.querySelector('#books-table tbody');
  const noMsg = el('no-books-msg');
  
  tbody.innerHTML = '';
  
  if(state.books.length === 0){
    noMsg.classList.remove('hidden');
    return;
  }
  
  noMsg.classList.add('hidden');
  
  state.books.forEach(book => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escapeHtml(book.title)}</td>
      <td>${escapeHtml(book.author)}</td>
      <td>${book.year || '-'}</td>
      <td>${book.available ? 'Yes' : 'No'}</td>
      <td class="actions">
        <button class="btn" data-action="edit" data-id="${book.id}">Edit</button>
        <button class="btn delete-btn" data-action="delete" data-id="${book.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Add a new book
// TODO: Replace with real API call
// Expected endpoint: POST /api/books
// Body: { title, author, year, available }
// Response: { success: boolean, book?: {id, title, author, year, available} }
function addBook(data){
  const book = {
    id: nextId(),
    title: data.title,
    author: data.author,
    year: data.year || '',
    available: data.available
  };
  
  // TODO: In production, make API call:
  // const response = await fetch('/api/books', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${state.currentAdmin.token}`
  //   },
  //   body: JSON.stringify(data)
  // });
  // const result = await response.json();
  // if(result.success) { state.books.push(result.book); }
  
  state.books.push(book);
  renderBooks();
  showNotification('Book added successfully', 'success');
}

// Update an existing book
// TODO: Replace with real API call
// Expected endpoint: PUT /api/books/:id
// Body: { title, author, year, available }
// Response: { success: boolean, message: string }
function updateBook(id, data){
  const idx = state.books.findIndex(b => b.id === id);
  if(idx === -1){
    showNotification('Book not found', 'error');
    return;
  }
  
  // TODO: In production, make API call:
  // const response = await fetch(`/api/books/${id}`, {
  //   method: 'PUT',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${state.currentAdmin.token}`
  //   },
  //   body: JSON.stringify(data)
  // });
  // const result = await response.json();
  // if(result.success) { state.books[idx] = { ...state.books[idx], ...data }; }
  
  state.books[idx] = { ...state.books[idx], ...data };
  renderBooks();
  showNotification('Book updated successfully', 'success');
}

// Delete a book
// TODO: Replace with real API call
// Expected endpoint: DELETE /api/books/:id
// Response: { success: boolean, message: string }
function deleteBook(id){
  // TODO: In production, make API call:
  // const response = await fetch(`/api/books/${id}`, {
  //   method: 'DELETE',
  //   headers: { 'Authorization': `Bearer ${state.currentAdmin.token}` }
  // });
  // const result = await response.json();
  // if(result.success) { state.books = state.books.filter(b => b.id !== id); }
  
  state.books = state.books.filter(b => b.id !== id);
  renderBooks();
  showNotification('Book deleted', 'info');
}

// ========================================
// UI Panel Management
// ========================================

function openAddPanel(){
  el('add-edit-title').textContent = 'Add New Book';
  el('book-id').value = '';
  el('book-title').value = '';
  el('book-author').value = '';
  el('book-year').value = '';
  el('book-available').value = 'true';
  el('add-edit-panel').classList.remove('hidden');
}

function openEditPanel(book){
  el('add-edit-title').textContent = 'Edit Book';
  el('book-id').value = book.id;
  el('book-title').value = book.title;
  el('book-author').value = book.author;
  el('book-year').value = book.year || '';
  el('book-available').value = book.available ? 'true' : 'false';
  el('add-edit-panel').classList.remove('hidden');
}

function closeAddPanel(){
  el('add-edit-panel').classList.add('hidden');
}

// ========================================
// Event Listeners
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  // Login Form
  el('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const username = el('login-username').value.trim();
    const password = el('login-password').value;
    
    if(loginAdmin(username, password)){
      showDashboard();
    }
  });

  // Logout Button
  el('btn-logout').addEventListener('click', () => {
    if(confirm('Are you sure you want to log out?')){
      logoutAdmin();
    }
  });

  // Show Add Book Panel
  el('btn-show-add').addEventListener('click', openAddPanel);

  // Cancel Add/Edit Panel
  el('btn-cancel').addEventListener('click', closeAddPanel);

  // Book Form Save
  el('form-book').addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = el('book-title').value.trim();
    const author = el('book-author').value.trim();
    const year = el('book-year').value ? Number(el('book-year').value) : '';
    const available = el('book-available').value === 'true';
    const bookId = el('book-id').value ? Number(el('book-id').value) : null;

    if(!title || !author){
      showNotification('Title and author are required', 'error');
      return;
    }

    const data = { title, author, year, available };

    if(bookId){
      updateBook(bookId, data);
    } else {
      addBook(data);
    }

    closeAddPanel();
    el('form-book').reset();
  });

  // Table Actions (Edit/Delete)
  document.querySelector('#books-table tbody').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;

    const action = btn.dataset.action;
    const id = Number(btn.dataset.id);

    if(action === 'edit'){
      const book = state.books.find(b => b.id === id);
      if(book) openEditPanel(book);
    } else if(action === 'delete'){
      if(confirm('Are you sure you want to delete this book?')){
        deleteBook(id);
      }
    }
  });

  // Initialize UI
  showLoginPage();
});
