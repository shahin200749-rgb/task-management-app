
import React from 'react';

function TaskList({ tasks, onDeleteTask, onToggleTask, onEditTask }) {
  const handleEdit = (task) => {
    const newTitle = prompt('Edit your task:', task.title);

    if (newTitle !== null && newTitle.trim() !== '') {
      onEditTask(task.id, newTitle.trim());
    }
  };

  return (
    <div>
      <h2>My Tasks</h2>

      {tasks.length === 0 ? (
        <p>No tasks available yet.</p>
      ) : (
        <ul>
          {tasks.map((task) => (
            <li key={task.id}>
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => onToggleTask(task.id)}
              />

              <span
                style={{
                  textDecoration: task.completed
                    ? 'line-through'
                    : 'none'
                }}
              >
                {task.title}
              </span>

              <button onClick={() => handleEdit(task)}>
                Edit
              </button>

              <button onClick={() => onDeleteTask(task.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TaskList;
