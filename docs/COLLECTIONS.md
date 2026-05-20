**Database Collections and Patterns**

- **Collections:** `books`, `admins`
 - **Collections:** `books`, `admins`, `users`

**Details (what's present in the codebase)**

- **`books`**:
  - Model: `Book` (defined in `server.js`)
  - Schema fields: `title`, `author`, `year`, `available`
  - Embedding / Referencing: No embedding or referencing used; book documents are standalone.
  - Bucket / Subset pattern: Not used.
  - Indexes: Only default `_id` index created by MongoDB. No other indexes in code.
  - Typical queries (found in code): `Book.find()`; `Book.findByIdAndUpdate()`, `Book.findByIdAndDelete()`, basic CRUD.

- **`admins`**:
  - Model: `Admin` (defined in `server.js`)
  - Schema fields: `username` (unique, required), `password` (required)
  - Embedding / Referencing: No embedding or referencing used.
  - Bucket / Subset pattern: Not used.
  - Indexes: `username` has a unique index via the schema option `{ unique: true }`. Also has default `_id` index.
  - Typical queries (found in code): `Admin.findOne({ username })`, `new Admin().save()`.

- **`users`**:
  - Model: `User` (added in `server.js`)
  - Schema fields: `username` (unique, required), `password` (required), `name`, `borrowed` (array of embedded subdocuments)
  - `borrowed` subdocument fields: `book` (ObjectId reference to `books`), `borrowDate`, `dueDate`, `returned`, `returnDate`
  - Embedding / Referencing: Uses a hybrid pattern — each user's borrow history is embedded as subdocuments inside the `users` document (embedding) while each borrow entry contains a reference to the `books` collection via `book: ObjectId` (referencing). This keeps per-user borrow metadata colocated while allowing population of book details.
  - Bucket / Subset pattern: Not currently used. If a user accumulates a very large borrow history, consider bucketing borrow entries or moving them to a separate `loans` collection (see recommendations).
  - Indexes: `username` should have a unique index (created by schema). Consider adding an index on `borrowed.book` if you need to efficiently query which users have borrowed a specific book across all users: `db.users.createIndex({ 'borrowed.book': 1 })`.
  - Typical queries (found in code): `User.findOne({ username })`, `User.findById(id).populate('borrowed.book')`, updates that push to `user.borrowed` and mark `user.borrowed.returned`.

**Relationships between collections**

- No relationships (no references, no foreign keys) are defined between `books` and `admins` or any other collections in the current codebase.

- Current relationships:
  - `users.borrowed.book` references `books._id` (one-way reference). This is the only cross-collection reference in the current codebase.

**Where embedding / referencing would be used (not present currently)**

- Embedding: use to store small, denormalized data that is always fetched with the parent (e.g., multiple authors or recent comments inside a `book` document).
- Referencing: use to model relations like `loans` or `borrowers` where you store `bookId` or `adminId` references to keep collections normalized and avoid document growth.

Notes on the chosen hybrid pattern

- The implementation stores borrow metadata embedded within `User` documents while referencing `Book` documents. This gives fast access to a user's borrow history and avoids a separate join step when only a user's history is required. However, it can make queries that need to find all active borrows for a given `book` less efficient unless you add an index on `borrowed.book`.
- If you expect many borrow entries per user (e.g., thousands), prefer one of:
  - A dedicated `loans` collection (each loan document references `user` and `book`) — good for large, global queries and avoids growing user documents.
  - A bucketed pattern for borrow history inside `users` (group entries into fixed-size subdocuments) to prevent large document growth.

**Bucket pattern / Subset pattern guidance (not used but when to apply)**

- Bucket pattern: useful for time-series or rapidly growing child arrays (e.g., `book.history` events); store multiple logical entries per bucket document to limit document growth.
- Subset pattern: useful to split frequently-accessed fields and rarely-accessed fields into separate collections (e.g., `books` and `book_metadata`).

**Indexing and query optimization (observations & recommendations)**

- Observed:
  - `admins.username` uses a unique index.
  - No other explicit indexes are defined; `books` queries will rely on `_id` index only.

 - Observed (updated):
  - `admins.username` uses a unique index.
  - `users.username` uses a unique index (schema-created).
  - `users.borrowed` is an embedded array referencing `books`; consider indexing `users.borrowed.book` for cross-user borrow queries.
  - No explicit indexes on `books` (other than `_id`).

- Recommendations:
    - For `users`:
      - Ensure the unique index on `username` exists: `db.users.createIndex({ username: 1 }, { unique: true })`.
      - If you need to query who has borrowed a particular book across users, add: `db.users.createIndex({ 'borrowed.book': 1 })`.
      - If you expect high write volume to `borrowed`, consider a separate `loans` collection and index by `book` and `user`.
  - Add indexes for common query patterns. Examples:
    - Single-field index on `author` if querying by author frequently: `db.books.createIndex({ author: 1 })`.
    - Text index for search across `title` and `author`: `db.books.createIndex({ title: 'text', author: 'text' })`.
    - Compound index for queries that filter/sort together, e.g., `{ author: 1, year: -1 }` for recent books by author.
  - Use projection to return only needed fields in reads: e.g., `Book.find({}, 'title author')`.
  - Paginate large result sets instead of `find()` returning everything; use `limit()` + `skip()` or range-based pagination on `_id`.
  - Use `lean()` with Mongoose for read-only queries to avoid hydration overhead: `Book.find().lean()`.
  - Use `explain()` to analyze slow queries and tune indexes accordingly.
  - Avoid unbounded sorts and unindexed filters which can cause COLLSCAN.

**Where to find the code**

- Main model definitions and usage: [server.js](server.js)

**Notes & Next steps**

- If you want, I can add suggested indexes directly (migration script or Mongoose index definitions) and add a `docs/README.md` with example `explain()` outputs for slow queries.
