import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = 'http://localhost:5001/api/tasks';

function App() {
  const [tasks, setTasks] = useState([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dailySummary, setDailySummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  // Fetch all tasks - memoized to prevent unnecessary re-renders
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_BASE_URL);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch daily summary
  const fetchDailySummary = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/summary`);
      setDailySummary(response.data);
      setShowSummary(true);
    } catch (error) {
      console.error('Error fetching daily summary:', error);
    }
  }, []);

  // Add a new task
  const addTask = useCallback(async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    try {
      const response = await axios.post(API_BASE_URL, { description });
      setTasks(prevTasks => [...prevTasks, response.data]);
      setDescription('');
    } catch (error) {
      console.error('Error adding task:', error);
    }
  }, [description]);

  // Complete a task
  const completeTask = useCallback(async (id) => {
    try {
      const taskToUpdate = tasks.find(task => task._id === id);
      if (taskToUpdate) {
        const updatedTask = { 
          ...taskToUpdate, 
          completed: !taskToUpdate.completed 
        };
        await axios.put(`${API_BASE_URL}/${id}`, updatedTask);
        
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task._id === id ? updatedTask : task
          )
        );
      }
    } catch (error) {
      console.error('Error completing task:', error);
    }
  }, [tasks]);

  // Delete a task
  const deleteTask = useCallback(async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      setTasks(prevTasks => prevTasks.filter(task => task._id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }, []);

  // Delete all completed tasks
  const deleteAllCompletedTasks = useCallback(async () => {
    try {
      const completedTasks = tasks.filter(task => task.completed);
      await Promise.all(
        completedTasks.map(task => axios.delete(`${API_BASE_URL}/${task._id}`))
      );
      setTasks(prevTasks => prevTasks.filter(task => !task.completed));
    } catch (error) {
      console.error('Error deleting completed tasks:', error);
    }
  }, [tasks]);

  // Update task priority
  const updateTaskPriority = useCallback(async (id, newPriority) => {
    try {
      const taskToUpdate = tasks.find(task => task._id === id);
      if (taskToUpdate) {
        const updatedTask = { 
          ...taskToUpdate, 
          priority: newPriority 
        };
        await axios.put(`${API_BASE_URL}/${id}`, updatedTask);
        
        setTasks(prevTasks => 
          prevTasks.map(task => 
            task._id === id ? updatedTask : task
          )
        );
      }
    } catch (error) {
      console.error('Error updating task priority:', error);
    }
  }, [tasks]);

  // Get priority label - memoized
  const getPriorityLabel = useCallback((priority) => {
    switch (priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Unknown';
    }
  }, []);

  // Get priority class - memoized
  const getPriorityClass = useCallback((priority) => {
    switch (priority) {
      case 1: return 'high-priority';
      case 2: return 'medium-priority';
      case 3: return 'low-priority';
      default: return '';
    }
  }, []);

  // Get category color - memoized
  const getCategoryColor = useCallback((category) => {
    const colors = {
      'Work': '#4f46e5',
      'Personal': '#ec4899',
      'Health': '#10b981',
      'Finance': '#f59e0b',
      'Learning': '#8b5cf6',
      'Errands': '#0ea5e9',
      'Uncategorized': '#64748b'
    };
    return colors[category] || colors['Uncategorized'];
  }, []);

  // Filter tasks - memoized for performance
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => 
      task.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);

  // Separate tasks by priority - memoized
  const { highPriorityTasks, mediumPriorityTasks, lowPriorityTasks, completedTasks } = useMemo(() => {
    const high = filteredTasks.filter(task => task.priority === 1 && !task.completed);
    const medium = filteredTasks.filter(task => task.priority === 2 && !task.completed);
    const low = filteredTasks.filter(task => task.priority === 3 && !task.completed);
    const completed = filteredTasks.filter(task => task.completed);
    return {
      highPriorityTasks: high,
      mediumPriorityTasks: medium,
      lowPriorityTasks: low,
      completedTasks: completed
    };
  }, [filteredTasks]);

  // Calculate statistics - memoized
  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = completedTasks.length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [tasks, completedTasks]);

  // Group tasks by category - memoized
  const tasksByCategory = useMemo(() => {
    const categories = {};
    [...highPriorityTasks, ...mediumPriorityTasks, ...lowPriorityTasks].forEach(task => {
      const category = task.category || 'Uncategorized';
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(task);
    });
    return categories;
  }, [highPriorityTasks, mediumPriorityTasks, lowPriorityTasks]);

  // Drag and drop handlers - memoized
  const handleDragStart = useCallback((e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e, newPriority) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    updateTaskPriority(taskId, newPriority);
  }, [updateTaskPriority]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Format time in minutes to hours and minutes
  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Format date to show only date without time
  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format completed date to show only date without time
  const formatCompletedDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="App">
      {/* Attractive Heading */}
      <div className="app-heading">
        <h1 className="app-title">PriorityFlow</h1>
        <p className="app-subtitle">Intelligent task management with AI-powered prioritization and drag-and-drop organization</p>
      </div>

      <header className="App-header">
        <h1>AI-Based Priority To-Do List</h1>
        <p>Tasks are automatically prioritized using AI or keyword analysis. Drag and drop tasks between priority levels.</p>
      </header>

      <div className="stats-container">
        <div className="stat-card">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        <div className="stat-card">
          <button 
            className="daily-summary-button"
            onClick={fetchDailySummary}
          >
            Daily Summary
          </button>
        </div>
      </div>

      {/* Daily Summary Modal */}
      {showSummary && dailySummary && (
        <div className="modal-overlay" onClick={() => setShowSummary(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Daily Summary</h2>
              <button className="modal-close" onClick={() => setShowSummary(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="summary-text">{dailySummary.summary}</p>
              <div className="summary-stats">
                <div className="summary-stat">
                  <span className="stat-number">{dailySummary.totalTasks}</span>
                  <span className="stat-label">Total Tasks</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-number">{dailySummary.completedTasks}</span>
                  <span className="stat-label">Completed</span>
                </div>
                <div className="summary-stat">
                  <span className="stat-number">{dailySummary.completionRate}%</span>
                  <span className="stat-label">Completion</span>
                </div>
              </div>
              <div className="category-distribution">
                <h3>Task Categories</h3>
                {Object.entries(dailySummary.categories).map(([category, count]) => (
                  <div key={category} className="category-item">
                    <span className="category-name">{category}</span>
                    <span className="category-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main>
        <form onSubmit={addTask} className="task-form">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a task (e.g., 'Finish report by Friday')"
            className="task-input"
          />
          <button type="submit" className="add-button">Add Task</button>
        </form>

        <div className="task-form">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tasks..."
            className="task-input"
          />
        </div>

        {loading ? (
          <p>Loading tasks...</p>
        ) : (
          <div className="tasks-board">
            <div 
              className="priority-column high-priority"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 1)}
            >
              <h2>High Priority</h2>
              <ul className="tasks-list">
                {highPriorityTasks.map((task) => (
                  <li 
                    key={task._id} 
                    className={`task-item ${getPriorityClass(task.priority)} ${task.completed ? 'completed' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task._id)}
                  >
                    <div className="task-content">
                      <span className="task-description">{task.description}</span>
                      <div className="task-meta">
                        <span className="task-category" style={{backgroundColor: getCategoryColor(task.category)}}>
                          {task.category}
                        </span>
                        {/* <span className="task-time">
                          ⏱️ {formatTime(task.estimatedTime)}
                        </span> */}
                        {task.deadline && (
                          <span className="task-deadline">
                            📅 {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                      <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                        {getPriorityLabel(task.priority)} Priority
                      </span>
                    </div>
                    <div className="task-actions">
                      <button 
                        onClick={() => completeTask(task._id)}
                        className="complete-button"
                      >
                        {task.completed ? 'Undo' : 'Complete'}
                      </button>
                      <button 
                        onClick={() => deleteTask(task._id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
                {highPriorityTasks.length === 0 && (
                  <li className="empty-state">No high priority tasks</li>
                )}
              </ul>
            </div>

            <div 
              className="priority-column medium-priority"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 2)}
            >
              <h2>Medium Priority</h2>
              <ul className="tasks-list">
                {mediumPriorityTasks.map((task) => (
                  <li 
                    key={task._id} 
                    className={`task-item ${getPriorityClass(task.priority)} ${task.completed ? 'completed' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task._id)}
                  >
                    <div className="task-content">
                      <span className="task-description">{task.description}</span>
                      <div className="task-meta">
                        <span className="task-category" style={{backgroundColor: getCategoryColor(task.category)}}>
                          {task.category}
                        </span>
                        {/* <span className="task-time">
                          ⏱️ {formatTime(task.estimatedTime)}
                        </span> */}
                        {task.deadline && (
                          <span className="task-deadline">
                            📅 {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                      <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                        {getPriorityLabel(task.priority)} Priority
                      </span>
                    </div>
                    <div className="task-actions">
                      <button 
                        onClick={() => completeTask(task._id)}
                        className="complete-button"
                      >
                        {task.completed ? 'Undo' : 'Complete'}
                      </button>
                      <button 
                        onClick={() => deleteTask(task._id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
                {mediumPriorityTasks.length === 0 && (
                  <li className="empty-state">No medium priority tasks</li>
                )}
              </ul>
            </div>

            <div 
              className="priority-column low-priority"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 3)}
            >
              <h2>Low Priority</h2>
              <ul className="tasks-list">
                {lowPriorityTasks.map((task) => (
                  <li 
                    key={task._id} 
                    className={`task-item ${getPriorityClass(task.priority)} ${task.completed ? 'completed' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task._id)}
                  >
                    <div className="task-content">
                      <span className="task-description">{task.description}</span>
                      <div className="task-meta">
                        <span className="task-category" style={{backgroundColor: getCategoryColor(task.category)}}>
                          {task.category}
                        </span>
                        {/* <span className="task-time">
                          ⏱️ {formatTime(task.estimatedTime)}
                        </span> */}
                        {task.deadline && (
                          <span className="task-deadline">
                            📅 {formatDate(task.deadline)}
                          </span>
                        )}
                      </div>
                      <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                        {getPriorityLabel(task.priority)} Priority
                      </span>
                    </div>
                    <div className="task-actions">
                      <button 
                        onClick={() => completeTask(task._id)}
                        className="complete-button"
                      >
                        {task.completed ? 'Undo' : 'Complete'}
                      </button>
                      <button 
                        onClick={() => deleteTask(task._id)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
                {lowPriorityTasks.length === 0 && (
                  <li className="empty-state">No low priority tasks</li>
                )}
              </ul>
            </div>
          </div>
        )}

        {completedTasks.length > 0 && (
          <div className="completed-tasks-section">
            <h2>
              Completed Tasks ({completedTasks.length})
              <button 
                onClick={deleteAllCompletedTasks}
                className="delete-all-button"
              >
                Delete All
              </button>
            </h2>
            <ul className="tasks-list">
              {completedTasks.map((task) => (
                <li 
                  key={task._id} 
                  className={`task-item ${getPriorityClass(task.priority)} completed`}
                >
                  <div className="task-content">
                    <span className="task-description">{task.description}</span>
                    <div className="task-meta">
                      <span className="task-category" style={{backgroundColor: getCategoryColor(task.category)}}>
                        {task.category}
                      </span>
                      {task.completedAt && (
                        <span className="task-completed">
                          ✅ Completed on {formatCompletedDate(task.completedAt)}
                        </span>
                      )}
                    </div>
                    <span className={`priority-badge ${getPriorityClass(task.priority)}`}>
                      {getPriorityLabel(task.priority)} Priority
                    </span>
                  </div>
                  <div className="task-actions">
                    <button 
                      onClick={() => completeTask(task._id)}
                      className="undo-button"
                    >
                      Undo
                    </button>
                    <button 
                      onClick={() => deleteTask(task._id)}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>

      {/* Small Footer */}
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-text">
            © {new Date().getFullYear()} PriorityFlow - AI-Powered Task Management
          </div>
          <div className="footer-divider">|</div>
          <div className="footer-divider">|</div>
          <div className="footer-text">
            <button className="footer-link" onClick={() => alert('Privacy Policy')}>
              Privacy Policy
            </button>
          </div>
          <div className="footer-divider">|</div>
          <div className="footer-text">
            <button className="footer-link" onClick={() => alert('Terms of Service')}>
              Terms of Service
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;