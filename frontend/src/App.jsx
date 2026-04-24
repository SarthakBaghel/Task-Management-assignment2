import { useEffect, useState } from 'react';

const emptyTaskForm = {
  id: '',
  title: '',
  description: '',
  dueDate: '',
  status: 'pending',
  categoryId: '',
  tagIds: [],
};

const emptyAuthForm = {
  email: '',
  password: '',
};

function toDateTimeLocal(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function getSelectedValues(event) {
  return Array.from(event.target.selectedOptions).map((option) => option.value);
}

function SectionHeading({ title, subtitle, right }) {
  return (
    <div className="panel-heading">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {right ? <div>{right}</div> : null}
    </div>
  );
}

function ResourceChips({ items, label, onRename, onDelete }) {
  if (items.length === 0) {
    return <p className="task-meta">No {label} yet.</p>;
  }

  return (
    <div className="chip-list">
      {items.map((item) => (
        <div className="chip" key={item.id}>
          <span>{item.name}</span>
          <button
            type="button"
            className="ghost-button"
            onClick={() => onRename(item)}
          >
            Rename
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={() => onDelete(item)}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}

function TaskCard({ task, onEdit, onComplete, onDelete }) {
  return (
    <article className="task-card">
      <div className="task-card-header">
        <div>
          <h3>{task.title}</h3>
          <div className="meta-row">
            <span className={`pill status-${task.status}`}>{task.status}</span>
            <span className="pill">
              Due {new Date(task.dueDate).toLocaleString()}
            </span>
            <span className="pill">{task.category?.name || 'No category'}</span>
          </div>
        </div>
      </div>

      <p className="task-description">{task.description || 'No description'}</p>

      <div className="tag-row">
        {task.tags.length > 0 ? (
          task.tags.map((tag) => (
            <span className="pill" key={tag.id}>
              {tag.name}
            </span>
          ))
        ) : (
          <span className="task-meta">No tags</span>
        )}
      </div>

      <div className="task-actions">
        <button type="button" className="ghost-button" onClick={() => onEdit(task)}>
          Edit
        </button>
        {task.status === 'pending' ? (
          <button type="button" onClick={() => onComplete(task.id)}>
            Mark complete
          </button>
        ) : null}
        <button
          type="button"
          className="danger-button"
          onClick={() => onDelete(task.id)}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('taskDemoToken') || ''
  );
  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [registerForm, setRegisterForm] = useState(emptyAuthForm);
  const [loginForm, setLoginForm] = useState(emptyAuthForm);
  const [categoryName, setCategoryName] = useState('');
  const [tagName, setTagName] = useState('');
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [filters, setFilters] = useState({ categoryId: '', tagIds: [] });

  function showMessage(text, type = 'info') {
    setMessage({ text, type });
  }

  function normalizeError(error) {
    if (error?.details?.length) {
      return error.details.map((detail) => detail.message).join(', ');
    }

    return error?.message || 'Something went wrong';
  }

  async function api(path, options = {}) {
    const config = {
      method: options.method || 'GET',
      headers: {},
    };

    if (options.body !== undefined) {
      config.headers['Content-Type'] = 'application/json';
      config.body = JSON.stringify(options.body);
    }

    if (token && options.auth !== false) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`/api${path}`, config);
    const isJson = response.headers
      .get('content-type')
      ?.includes('application/json');
    const payload = isJson ? await response.json() : null;

    if (!response.ok) {
      throw payload?.error || new Error('Request failed');
    }

    return payload;
  }

  function sanitizeSelections(nextCategories, nextTags) {
    setTaskForm((current) => ({
      ...current,
      categoryId: nextCategories.some((item) => item.id === current.categoryId)
        ? current.categoryId
        : '',
      tagIds: current.tagIds.filter((id) =>
        nextTags.some((item) => item.id === id)
      ),
    }));

    setFilters((current) => ({
      ...current,
      categoryId: nextCategories.some((item) => item.id === current.categoryId)
        ? current.categoryId
        : '',
      tagIds: current.tagIds.filter((id) => nextTags.some((item) => item.id === id)),
    }));
  }

  async function loadCategories() {
    const response = await api('/categories');
    const nextCategories = response.data.categories;
    setCategories(nextCategories);
    sanitizeSelections(nextCategories, tags);
    return nextCategories;
  }

  async function loadTags() {
    const response = await api('/tags');
    const nextTags = response.data.tags;
    setTags(nextTags);
    sanitizeSelections(categories, nextTags);
    return nextTags;
  }

  async function loadTasks(nextFilters = filters) {
    const params = new URLSearchParams();

    if (nextFilters.categoryId) {
      params.set('categoryId', nextFilters.categoryId);
    }

    if (nextFilters.tagIds.length > 0) {
      params.set('tagIds', nextFilters.tagIds.join(','));
    }

    const query = params.toString();
    const response = await api(`/tasks${query ? `?${query}` : ''}`);
    setTasks(response.data.tasks);
  }

  async function loadWorkspace() {
    const nextCategories = await loadCategories();
    const nextTags = await loadTags();
    sanitizeSelections(nextCategories, nextTags);
    await loadTasks();
  }

  function resetTaskForm() {
    setTaskForm(emptyTaskForm);
  }

  function handleLogout() {
    localStorage.removeItem('taskDemoToken');
    setToken('');
    setUser(null);
    setCategories([]);
    setTags([]);
    setTasks([]);
    setFilters({ categoryId: '', tagIds: [] });
    resetTaskForm();
    showMessage('Logged out.');
  }

  useEffect(() => {
    if (token) {
      localStorage.setItem('taskDemoToken', token);
      return;
    }

    localStorage.removeItem('taskDemoToken');
  }, [token]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await api('/auth/me');

        if (cancelled) {
          return;
        }

        setUser(response.data.user);
        await loadWorkspace();
      } catch (error) {
        if (cancelled) {
          return;
        }

        setToken('');
        setUser(null);
        showMessage(normalizeError(error), 'error');
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleRegisterSubmit(event) {
    event.preventDefault();

    try {
      await api('/auth/register', {
        method: 'POST',
        auth: false,
        body: registerForm,
      });
      setRegisterForm(emptyAuthForm);
      showMessage('Account created. You can login now.');
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();

    try {
      const response = await api('/auth/login', {
        method: 'POST',
        auth: false,
        body: loginForm,
      });

      setToken(response.data.token);
      setUser(response.data.user);
      setLoginForm(emptyAuthForm);
      showMessage('Logged in successfully.');
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function handleCreateCategory(event) {
    event.preventDefault();

    try {
      await api('/categories', {
        method: 'POST',
        body: { name: categoryName },
      });
      setCategoryName('');
      await loadWorkspace();
      showMessage('Category created.');
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function handleCreateTag(event) {
    event.preventDefault();

    try {
      await api('/tags', {
        method: 'POST',
        body: { name: tagName },
      });
      setTagName('');
      await loadWorkspace();
      showMessage('Tag created.');
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function renameResource(type, item) {
    const nextName = window.prompt(`Rename ${type}`, item.name);

    if (!nextName || !nextName.trim()) {
      return;
    }

    try {
      await api(`/${type === 'category' ? 'categories' : 'tags'}/${item.id}`, {
        method: 'PATCH',
        body: { name: nextName.trim() },
      });
      await loadWorkspace();
      showMessage(`${type === 'category' ? 'Category' : 'Tag'} updated.`);
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function deleteResource(type, item) {
    if (!window.confirm(`Delete this ${type}?`)) {
      return;
    }

    try {
      await api(`/${type === 'category' ? 'categories' : 'tags'}/${item.id}`, {
        method: 'DELETE',
      });
      await loadWorkspace();
      showMessage(`${type === 'category' ? 'Category' : 'Tag'} deleted.`);
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();

    const body = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      dueDate: new Date(taskForm.dueDate).toISOString(),
      status: taskForm.status,
      categoryId: taskForm.categoryId || null,
      tagIds: taskForm.tagIds,
    };

    try {
      if (taskForm.id) {
        await api(`/tasks/${taskForm.id}`, {
          method: 'PATCH',
          body,
        });
        showMessage('Task updated.');
      } else {
        await api('/tasks', {
          method: 'POST',
          body,
        });
        showMessage('Task created.');
      }

      resetTaskForm();
      await loadTasks();
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  function handleEditTask(task) {
    setTaskForm({
      id: task.id,
      title: task.title,
      description: task.description || '',
      dueDate: toDateTimeLocal(task.dueDate),
      status: task.status,
      categoryId: task.category?.id || '',
      tagIds: task.tags.map((tag) => tag.id),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleCompleteTask(taskId) {
    try {
      await api(`/tasks/${taskId}`, {
        method: 'PATCH',
        body: { status: 'completed' },
      });
      await loadTasks();
      showMessage('Task marked as completed.');
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function handleDeleteTask(taskId) {
    if (!window.confirm('Delete this task?')) {
      return;
    }

    try {
      await api(`/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (taskForm.id === taskId) {
        resetTaskForm();
      }

      await loadTasks();
      showMessage('Task deleted.');
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function applyFilters(event) {
    event.preventDefault();

    try {
      await loadTasks(filters);
      showMessage('Filters applied.');
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function clearFilters() {
    const nextFilters = { categoryId: '', tagIds: [] };
    setFilters(nextFilters);

    try {
      await loadTasks(nextFilters);
      showMessage('Filters cleared.');
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  async function refreshWorkspace() {
    try {
      await loadWorkspace();
      showMessage('Data refreshed.');
    } catch (error) {
      showMessage(normalizeError(error), 'error');
    }
  }

  const loggedIn = Boolean(token && user);

  return (
    <div className="page-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Assignment 3 Demo</p>
          <h1>Task Management Dashboard</h1>
          <p className="hero-copy">
            A basic React frontend to register, login, manage categories and
            tags, create tasks, filter tasks, and mark them complete.
          </p>
        </div>

        <div className="hero-card">
          <p className="hero-label">Frontend</p>
          <p className="hero-value">React + Vite</p>
          <button type="button" className="ghost-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {message.text ? (
        <p className={`message-banner ${message.type === 'error' ? 'error' : ''}`}>
          {message.text}
        </p>
      ) : null}

      <main className="dashboard">
        <section className="panel">
          <SectionHeading
            title="Account"
            subtitle="Register or login to start using the API."
          />

          <div className="user-summary">
            <span className="summary-label">Current user</span>
            <strong>{loggedIn ? `${user.email} (id ${user.id})` : 'Not logged in'}</strong>
          </div>

          <div className="auth-grid">
            <form className="stacked-form" onSubmit={handleRegisterSubmit}>
              <h3>Register</h3>

              <label>
                Email
                <input
                  type="email"
                  value={registerForm.email}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <button type="submit">Create account</button>
            </form>

            <form className="stacked-form" onSubmit={handleLoginSubmit}>
              <h3>Login</h3>

              <label>
                Email
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    setLoginForm((current) => ({
                      ...current,
                      password: event.target.value,
                    }))
                  }
                  required
                />
              </label>

              <button type="submit">Login</button>
            </form>
          </div>
        </section>

        {loggedIn ? (
          <section className="workspace">
            <div className="workspace-grid">
              <section className="panel">
                <SectionHeading
                  title="Categories"
                  subtitle="Create and manage task categories."
                />

                <form className="inline-form" onSubmit={handleCreateCategory}>
                  <input
                    type="text"
                    placeholder="Add category"
                    value={categoryName}
                    onChange={(event) => setCategoryName(event.target.value)}
                    required
                  />
                  <button type="submit">Add</button>
                </form>

                <ResourceChips
                  items={categories}
                  label="categories"
                  onRename={(item) => renameResource('category', item)}
                  onDelete={(item) => deleteResource('category', item)}
                />
              </section>

              <section className="panel">
                <SectionHeading
                  title="Tags"
                  subtitle="Create and manage reusable tags."
                />

                <form className="inline-form" onSubmit={handleCreateTag}>
                  <input
                    type="text"
                    placeholder="Add tag"
                    value={tagName}
                    onChange={(event) => setTagName(event.target.value)}
                    required
                  />
                  <button type="submit">Add</button>
                </form>

                <ResourceChips
                  items={tags}
                  label="tags"
                  onRename={(item) => renameResource('tag', item)}
                  onDelete={(item) => deleteResource('tag', item)}
                />
              </section>
            </div>

            <section className="panel">
              <SectionHeading
                title="Task Form"
                subtitle="Create a new task or edit an existing one."
              />

              <form className="task-form" onSubmit={handleTaskSubmit}>
                <label>
                  Title
                  <input
                    type="text"
                    value={taskForm.title}
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  Description
                  <textarea
                    rows="3"
                    value={taskForm.description}
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>

                <div className="form-grid">
                  <label>
                    Due date
                    <input
                      type="datetime-local"
                      value={taskForm.dueDate}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          dueDate: event.target.value,
                        }))
                      }
                      required
                    />
                  </label>

                  <label>
                    Status
                    <select
                      value={taskForm.status}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                    >
                      <option value="pending">Pending</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>

                  <label>
                    Category
                    <select
                      value={taskForm.categoryId}
                      onChange={(event) =>
                        setTaskForm((current) => ({
                          ...current,
                          categoryId: event.target.value,
                        }))
                      }
                    >
                      <option value="">No category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label>
                  Tags
                  <select
                    multiple
                    size="5"
                    value={taskForm.tagIds}
                    onChange={(event) =>
                      setTaskForm((current) => ({
                        ...current,
                        tagIds: getSelectedValues(event),
                      }))
                    }
                  >
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="button-row">
                  <button type="submit">
                    {taskForm.id ? 'Update task' : 'Create task'}
                  </button>
                  {taskForm.id ? (
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={resetTaskForm}
                    >
                      Cancel edit
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="panel">
              <SectionHeading
                title="Filters"
                subtitle="Filter tasks by category and tags."
              />

              <form className="filter-form" onSubmit={applyFilters}>
                <label>
                  Category
                  <select
                    value={filters.categoryId}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        categoryId: event.target.value,
                      }))
                    }
                  >
                    <option value="">All categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Tags
                  <select
                    multiple
                    size="4"
                    value={filters.tagIds}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        tagIds: getSelectedValues(event),
                      }))
                    }
                  >
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="button-row">
                  <button type="submit">Apply filters</button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={clearFilters}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={refreshWorkspace}
                  >
                    Refresh
                  </button>
                </div>
              </form>
            </section>

            <section className="panel">
              <SectionHeading
                title="Tasks"
                subtitle={`${tasks.length} task${tasks.length === 1 ? '' : 's'}`}
              />

              <div className="task-list">
                {tasks.length > 0 ? (
                  tasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onEdit={handleEditTask}
                      onComplete={handleCompleteTask}
                      onDelete={handleDeleteTask}
                    />
                  ))
                ) : (
                  <p className="task-meta">
                    No tasks found for the current filters.
                  </p>
                )}
              </div>
            </section>
          </section>
        ) : null}
      </main>
    </div>
  );
}
