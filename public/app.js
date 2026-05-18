// ========================================
// App State
// ========================================
const state = {
  books: [],
  currentAdmin: null
};

const el = id => document.getElementById(id);

function showNotification(message, type='info', timeout=3000){
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
// Navigation
// ========================================
function showLoginPage(){
  el('login-page').classList.remove('hidden');
  el('dashboard').classList.add('hidden');
  showNotification('Please log in to continue.', 'info');
}

function showDashboard(){
  el('login-page').classList.add('hidden');
  el('dashboard').classList.remove('hidden');
  updateAdminInfo();
  fetchBooks();
}

function updateAdminInfo(){
  const adminInfo = el('admin-info');
  if(state.currentAdmin){
    adminInfo.textContent = `Admin: ${state.currentAdmin.username}`;
  }
}

// ========================================
// AUTH: Login & Logout
// ========================================
async function loginAdmin(username, password){
  if(!username || !password){
    showNotification('Please enter both username and password', 'error');
    return false;
  }
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if(res.ok){
      state.currentAdmin = { username };
      showNotification(`Welcome, ${username}!`, 'success');
      showDashboard();
      return true;
    } else {
      showNotification(data.error || 'Login failed', 'error');
      return false;
    }
  } catch(e) {
    showNotification('Server error', 'error');
    return false;
  }
}

function logoutAdmin(){
  state.currentAdmin = null;
  el('form-login').reset();
  showNotification('Logged out', 'info');
  showLoginPage();
}

// ========================================
// Book CRUD (API!)
// ========================================
async function fetchBooks(){
  try {
    const res = await fetch('/api/books');
    state.books = await res.json();
    renderBooks();
  } catch(e){
    showNotification('Error loading books', 'error');
  }
}

function renderBooks(){
  if(!state.currentAdmin) return;
  const tbody = document.querySelector('#books-table tbody');
  const noMsg = el('no-books-msg');
  tbody.innerHTML = '';
  if(!state.books.length){
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
        <button class="btn" data-action="edit" data-id="${book._id}">Edit</button>
        <button class="btn delete-btn" data-action="delete" data-id="${book._id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function addBook(data){
  try {
    const res = await fetch('/api/books', {
      method:'POST',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    });
    if(res.ok){
      showNotification('Book added successfully', 'success');
      fetchBooks();
    } else {
      showNotification('Failed to add book', 'error');
    }
  } catch {
    showNotification('Server error', 'error');
  }
}

async function updateBook(id, data){
  try {
    const res = await fetch(`/api/books/${id}`, {
      method:'PUT',
      headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify(data)
    });
    if(res.ok){
      showNotification('Book updated successfully', 'success');
      fetchBooks();
    } else {
      showNotification('Failed to update book', 'error');
    }
  } catch {
    showNotification('Server error', 'error');
  }
}

async function deleteBook(id){
  try {
    const res = await fetch(`/api/books/${id}`, { method:'DELETE' });
    if(res.ok){
      showNotification('Book deleted', 'info');
      fetchBooks();
    } else {
      showNotification('Failed to delete book', 'error');
    }
  } catch {
    showNotification('Server error', 'error');
  }
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
  el('book-id').value = book._id;
  el('book-title').value = book.title;
  el('book-author').value = book.author;
  el('book-year').value = book.year || '';
  el('book-available').value = book.available ? 'true' : 'false';
  el('add-edit-panel').classList.remove('hidden');
}
function closeAddPanel(){
  el('add-edit-panel').classList.add('hidden');
}
function escapeHtml(str){
  return String(str).replace(/[&<>"']/g, c=> ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#39;"
  }[c]));
}

// ========================================
// Event Listeners
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  // Login Form
  el('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = el('login-username').value.trim();
    const password = el('login-password').value;
    await loginAdmin(username, password);
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
  el('form-book').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = el('book-title').value.trim();
    const author = el('book-author').value.trim();
    const year = el('book-year').value ? Number(el('book-year').value) : '';
    const available = el('book-available').value === 'true';
    const bookId = el('book-id').value;
    if(!title || !author){
      showNotification('Title and author are required', 'error');
      return;
    }
    const data = { title, author, year, available };
    if(bookId){
      await updateBook(bookId, data);
    } else {
      await addBook(data);
    }
    closeAddPanel();
    el('form-book').reset();
  });

  // Table Actions
  document.querySelector('#books-table tbody').addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if(!btn) return;
    const action = btn.dataset.action;
    const id = btn.dataset.id;
    if(action === 'edit'){
      const book = state.books.find(b => b._id === id);
      if(book) openEditPanel(book);
    } else if(action === 'delete'){
      if(confirm('Are you sure you want to delete this book?')){
        await deleteBook(id);
      }
    }
  });

  // Initialize UI
  showLoginPage();
});