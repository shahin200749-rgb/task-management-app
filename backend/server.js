
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Home route
app.get('/', (req, res) => {
    res.send('Task Management API is running!');
});

// Database health check
app.get('/api/health', (req, res) => {
    db.query('SELECT 1 AS test', (err, results) => {
        if (err) {
            console.error('HEALTH ERROR:', err.message);
            return res.status(500).json({
                success: false,
                error: 'Database connection failed'
            });
        }

        res.json({
            success: true,
            message: 'Database is working!',
            result: results
        });
    });
});

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );
};

// Register API
app.post('/api/register', async (req, res) => {
    console.log('REGISTER API CALLED');

    const { name, email, password } = req.body;

    if (
        typeof name !== 'string' ||
        !name.trim() ||
        typeof email !== 'string' ||
        !email.trim() ||
        typeof password !== 'string' ||
        password.length < 6
    ) {
        return res.status(400).json({
            message: 'Enter valid name, email and password (minimum 6 characters)'
        });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [cleanName, cleanEmail, hashedPassword],
            (err, result) => {
                if (err) {
                    console.error('REGISTER ERROR:', err.message);

                    if (err.code === 'ER_DUP_ENTRY') {
                        return res.status(409).json({
                            message: 'Email already registered'
                        });
                    }

                    return res.status(500).json({
                        message: 'Registration failed'
                    });
                }

                const user = {
                    id: result.insertId,
                    name: cleanName,
                    email: cleanEmail
                };

                try {
                    const token = generateToken(user);

                    res.status(201).json({
                        message: 'Registration successful!',
                        token,
                        user
                    });
                } catch (error) {
                    console.error('TOKEN ERROR:', error.message);

                    return res.status(500).json({
                        message: 'Token generation failed'
                    });
                }
            }
        );
    } catch (error) {
        console.error('REGISTER ERROR:', error.message);

        res.status(500).json({
            message: 'Registration failed'
        });
    }
});

// Login API
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;

    if (
        typeof email !== 'string' ||
        typeof password !== 'string' ||
        !email.trim() ||
        !password
    ) {
        return res.status(400).json({
            message: 'Email and password are required'
        });
    }

    const cleanEmail = email.trim().toLowerCase();

    db.query(
        'SELECT id, name, email, password FROM users WHERE email = ?',
        [cleanEmail],
        async (err, results) => {
            if (err) {
                console.error('LOGIN ERROR:', err.message);

                return res.status(500).json({
                    message: 'Login failed'
                });
            }

            if (results.length === 0) {
                return res.status(401).json({
                    message: 'Invalid email or password'
                });
            }

            const user = results[0];

            try {
                const passwordMatch = await bcrypt.compare(
                    password,
                    user.password
                );

                if (!passwordMatch) {
                    return res.status(401).json({
                        message: 'Invalid email or password'
                    });
                }

                const token = generateToken(user);

                res.json({
                    message: 'Login successful!',
                    token,
                    user: {
                        id: user.id,
                        name: user.name,
                        email: user.email
                    }
                });
            } catch (error) {
                console.error('LOGIN ERROR:', error.message);

                res.status(500).json({
                    message: 'Login failed'
                });
            }
        }
    );
});

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            message: 'Access denied. Please login.'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                message: 'Invalid or expired token'
            });
        }

        req.user = user;
        next();
    });
};

// Get logged-in user's tasks
app.get('/api/tasks', authenticateToken, (req, res) => {
    db.query(
        'SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC',
        [req.user.id],
        (err, results) => {
            if (err) {
                console.error('GET ERROR:', err.message);

                return res.status(500).json({
                    message: 'Unable to fetch tasks'
                });
            }

            res.json(results);
        }
    );
});

// Add a new task
app.post('/api/tasks', authenticateToken, (req, res) => {
    const { title } = req.body;

    if (typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({
            message: 'Task title is required'
        });
    }

    db.query(
        'INSERT INTO tasks (title, user_id) VALUES (?, ?)',
        [title.trim(), req.user.id],
        (err, result) => {
            if (err) {
                console.error('INSERT ERROR:', err.message);

                return res.status(500).json({
                    message: 'Unable to add task'
                });
            }

            res.status(201).json({
                id: result.insertId,
                title: title.trim(),
                completed: false,
                user_id: req.user.id,
                message: 'Task added successfully!'
            });
        }
    );
});

// Update task completion
app.put('/api/tasks/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const { completed } = req.body;

    if (
        !Number.isInteger(id) ||
        id <= 0 ||
        typeof completed !== 'boolean'
    ) {
        return res.status(400).json({
            message: 'Invalid task ID or completed status'
        });
    }

    db.query(
        'UPDATE tasks SET completed = ? WHERE id = ? AND user_id = ?',
        [completed, id, req.user.id],
        (err, result) => {
            if (err) {
                console.error('UPDATE ERROR:', err.message);

                return res.status(500).json({
                    message: 'Unable to update task'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Task not found'
                });
            }

            res.json({
                message: 'Task updated successfully!'
            });
        }
    );
});

// Edit task title
app.patch('/api/tasks/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);
    const { title } = req.body;

    if (
        !Number.isInteger(id) ||
        id <= 0 ||
        typeof title !== 'string' ||
        !title.trim()
    ) {
        return res.status(400).json({
            message: 'Invalid task ID or title'
        });
    }

    db.query(
        'UPDATE tasks SET title = ? WHERE id = ? AND user_id = ?',
        [title.trim(), id, req.user.id],
        (err, result) => {
            if (err) {
                console.error('EDIT ERROR:', err.message);

                return res.status(500).json({
                    message: 'Unable to edit task'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Task not found'
                });
            }

            res.json({
                message: 'Task updated successfully!'
            });
        }
    );
});

// Delete a task
app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
            message: 'Invalid task ID'
        });
    }

    db.query(
        'DELETE FROM tasks WHERE id = ? AND user_id = ?',
        [id, req.user.id],
        (err, result) => {
            if (err) {
                console.error('DELETE ERROR:', err.message);

                return res.status(500).json({
                    message: 'Unable to delete task'
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    message: 'Task not found'
                });
            }

            res.json({
                message: 'Task deleted successfully!'
            });
        }
    );
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
