CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at INTEGER NOT NULL,
    due_date INTEGER,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')),
    color TEXT,
    notes TEXT,
    tags TEXT, -- Stored as JSON array
    links TEXT  -- Stored as JSON array
);

CREATE INDEX idx_completed ON tasks(completed);
CREATE INDEX idx_due_date ON tasks(due_date);
