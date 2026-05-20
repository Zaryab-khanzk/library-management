// Simple user portal script
const userState = { books: [], currentUser: null };
const $ = id => document.getElementById(id);

function showNotification(message, type='info', timeout=3000){
  const el = $('notification');
  if(!el) return;
  el.textContent = message;
  el.className = `notification ${type}`;
  el.classList.remove('hidden');
  if(timeout>0) setTimeout(()=> el.classList.add('hidden'), timeout);
}

function showUserPortal(){
  $('user-login-page').classList.add('hidden');
  $('user-portal').classList.remove('hidden');
  $('user-info').textContent = `User: ${userState.currentUser.username}`;
  fetchBooks();
  fetchUser();
}

function showLoginPage(){
  $('user-login-page').classList.remove('hidden');
  $('user-portal').classList.add('hidden');
}

async function registerUser(name, username, password){
  try{
    const res = await fetch('/api/users', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name, username, password })});
    const data = await res.json();
    if(res.ok){
      showNotification('Registered successfully. Please login.', 'success');
      $('form-user-register').reset();
    } else {
      showNotification(data.error || 'Registration failed', 'error');
    }
  } catch(e){ showNotification('Server error', 'error'); }
}

async function loginUser(username, password){
  try{
    const res = await fetch('/api/users/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ username, password })});
    const data = await res.json();
    if(res.ok){
      userState.currentUser = data.user;
      showNotification(`Welcome ${data.user.username}`, 'success');
      showUserPortal();
      return true;
    } else {
      showNotification(data.error || 'Login failed', 'error');
      return false;
    }
  } catch(e){ showNotification('Server error', 'error'); return false; }
}

async function fetchBooks(){
  try{
    const res = await fetch('/api/books');
    userState.books = await res.json();
    renderBooks();
  } catch(e){ showNotification('Error loading books', 'error'); }
}

function renderBooks(){
  const tbody = document.querySelector('#books-table tbody');
  const noMsg = $('no-books-msg');
  tbody.innerHTML = '';
  if(!userState.books.length){ noMsg.classList.remove('hidden'); return; }
  noMsg.classList.add('hidden');
  userState.books.forEach(b=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${escapeHtml(b.title)}</td><td>${escapeHtml(b.author)}</td><td>${b.year||'-'}</td><td>${b.available? 'Yes':'No'}</td><td>${b.available?`<button class="btn" data-id="${b._id}" data-action="borrow">Borrow</button>`:'-'}</td>`;
    tbody.appendChild(tr);
  });
}

function escapeHtml(str){ return String(str).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

async function fetchUser(){
  try{
    const res = await fetch(`/api/users/${userState.currentUser.id}`);
    if(!res.ok) return;
    const user = await res.json();
    renderBorrowed(user.borrowed || []);
  } catch(e){ console.error(e); }
}

function renderBorrowed(list){
  const ul = $('borrowed-list');
  ul.innerHTML = '';
  if(!list.length){ ul.innerHTML = '<li>No borrowed books</li>'; return; }
  list.forEach(entry=>{
    const book = entry.book || {};
    const li = document.createElement('li');
    li.innerHTML = `${escapeHtml(book.title||'Unknown')} — Due: ${entry.dueDate? new Date(entry.dueDate).toLocaleDateString() : '-'} ${entry.returned?'<strong>(Returned)</strong>':'<button class="btn" data-action="return" data-id="'+(book._id||'')+'">Return</button>'}`;
    ul.appendChild(li);
  });
}

async function borrowBook(bookId){
  try{
    const res = await fetch(`/api/users/${userState.currentUser.id}/borrow`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ bookId })});
    if(res.ok){
      showNotification('Book borrowed', 'success');
      fetchBooks(); fetchUser();
    } else {
      const data = await res.json(); showNotification(data.error||'Failed to borrow', 'error');
    }
  } catch(e){ showNotification('Server error', 'error'); }
}

async function returnBook(bookId){
  try{
    const res = await fetch(`/api/users/${userState.currentUser.id}/return`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ bookId })});
    if(res.ok){ showNotification('Book returned', 'success'); fetchBooks(); fetchUser(); }
    else { const data = await res.json(); showNotification(data.error||'Failed to return', 'error'); }
  } catch(e){ showNotification('Server error', 'error'); }
}

document.addEventListener('DOMContentLoaded', ()=>{
  // register
  $('form-user-register').addEventListener('submit', async (e)=>{ e.preventDefault(); const name=$('user-register-name').value.trim(); const username=$('user-register-username').value.trim(); const password=$('user-register-password').value; await registerUser(name, username, password); });
  // login
  $('form-user-login').addEventListener('submit', async (e)=>{ e.preventDefault(); const username=$('user-login-username').value.trim(); const password=$('user-login-password').value; await loginUser(username, password); });
  // logout
  $('btn-user-logout').addEventListener('click', ()=>{ userState.currentUser=null; showNotification('Logged out', 'info'); showLoginPage(); });
  // book borrow/return actions (delegated)
  document.querySelector('#books-table tbody').addEventListener('click', async (e)=>{ const btn = e.target.closest('button'); if(!btn) return; const action = btn.dataset.action; const id = btn.dataset.id; if(action==='borrow'){ await borrowBook(id); } });
  document.getElementById('borrowed-list').addEventListener('click', async (e)=>{ const btn = e.target.closest('button'); if(!btn) return; if(btn.dataset.action==='return'){ const id = btn.dataset.id; await returnBook(id); } });
});
