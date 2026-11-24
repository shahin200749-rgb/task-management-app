
import React, { useState, useEffect } from 'react';
import './App.css';
import AddTask from './components/AddTask';
import TaskList from './components/TaskList';
import Auth from './Auth';

function App() {
  const [tasks, setTasks] = useState([]);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  const token = localStorage.getItem('token');

  // Load tasks for logged-in user
  useEffect(() => {
    const savedToken = localStorage.getItem('token');

    if (savedToken && user) {
      const fetchTasks = async () => {
        try {
          const response = await fetch(
            'http://localhost:5000/api/tasks',
            {
              headers: {
                Authorization: `Bearer ${savedToken}`
              }
            }
          );

          if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
            setTasks([]);
            return;
          }

          if (!response.ok) {
            throw new Error('Failed to load tasks');
          }

          const data = await response.json();

          setTasks(
            data.map((task) => ({
              ...task,
              completed: Boolean(task.completed)
            }))
          );

        } catch (error) {
          console.error('Error loading tasks:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchTasks();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Login or Register success
  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    setLoading(true);
  };

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');

    setUser(null);
    setTasks([]);
  };

  // Add Task
  const addTask = async (newTask) => {
    try {
      const response = await fetch(
        'http://localhost:5000/api/tasks',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ title: newTask })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add task');
      }

      const savedTask = await response.json();

      setTasks((previousTasks) => [
        { ...savedTask, completed: Boolean(savedTask.completed) },
        ...previousTasks
      ]);

    } catch (error) {
      console.error('Error adding task:', error);
      alert('Unable to add task. Please try again.');
    }
  };

  // Delete Task
  const deleteTask = async (id) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks((previousTasks) =>
        previousTasks.filter((task) => task.id !== id)
      );

    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Unable to delete task. Please try again.');
    }
  };

  // Update Task Completion
  const toggleTask = async (id) => {
    const task = tasks.find((item) => item.id === id);

    if (!task) return;

    const newCompletedStatus = !task.completed;

    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            completed: newCompletedStatus
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update task');
      }

      setTasks((previousTasks) =>
        previousTasks.map((item) =>
          item.id === id
            ? { ...item, completed: newCompletedStatus }
            : item
        )
      );

    } catch (error) {
      console.error('Error updating task:', error);
      alert('Unable to update task. Please try again.');
    }
  };

  // Edit Task
  const editTask = async (id, newTitle) => {
    try {
      const response = await fetch(
        `http://localhost:5000/api/tasks/${id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: newTitle
          })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to edit task');
      }

      setTasks((previousTasks) =>
        previousTasks.map((task) =>
          task.id === id
            ? { ...task, title: newTitle }
            : task
        )
      );

    } catch (error) {
      console.error('Error editing task:', error);
      alert('Unable to edit task. Please try again.');
    }
  };

  // Show Login/Register page
  if (!user || !token) {
    return <Auth onLogin={handleLogin} />;
  }

  if (loading) {
    return <p>Loading your tasks...</p>;
  }

  return (
    <div className="App">
      <h1>Task Management App</h1>

      <p>Welcome, {user.name}!</p>

      <button onClick={handleLogout}>
        Logout
      </button>

      <AddTask onAddTask={addTask} />

      <TaskList
        tasks={tasks}
        onDeleteTask={deleteTask}
        onToggleTask={toggleTask}
        onEditTask={editTask}
      />
    </div>
  );
}

export default App;
