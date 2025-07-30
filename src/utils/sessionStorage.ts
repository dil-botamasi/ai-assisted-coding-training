import type { Todo } from '../types/Todo';

const STORAGE_KEY = 'todos';

/**
 * Validates that an object has the required Todo structure
 */
export const isValidTodo = (obj: unknown): obj is Todo => {
  if (!obj || typeof obj !== 'object') return false;

  const todo = obj as Record<string, unknown>;

  return (
    typeof todo.id === 'string' &&
    typeof todo.title === 'string' &&
    typeof todo.description === 'string' &&
    typeof todo.completed === 'boolean' &&
    (todo.createdAt instanceof Date || typeof todo.createdAt === 'string')
  );
};

/**
 * Validates that the loaded data is an array of valid Todo objects
 */
export const isValidTodos = (data: unknown): data is Todo[] => {
  if (!Array.isArray(data)) return false;
  return data.every(isValidTodo);
};

/**
 * Loads todos from sessionStorage
 * Returns empty array if no data exists, is corrupted, or validation fails
 */
export const loadTodos = (): Todo[] => {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);

    // Convert createdAt strings back to Date objects
    const todosWithDates = Array.isArray(parsed)
      ? parsed.map(todo => ({
          ...todo,
          createdAt: typeof todo.createdAt === 'string' ? new Date(todo.createdAt) : todo.createdAt,
        }))
      : parsed;

    if (isValidTodos(todosWithDates)) {
      return todosWithDates;
    }

    // If validation fails, clear corrupted data and return empty array
    console.warn('Corrupted todo data found in sessionStorage, clearing...');
    window.sessionStorage.removeItem(STORAGE_KEY);
    return [];
  } catch (error) {
    console.warn('Failed to load todos from sessionStorage:', error);
    // Clear corrupted data
    window.sessionStorage.removeItem(STORAGE_KEY);
    return [];
  }
};

/**
 * Saves todos to sessionStorage with error handling
 * Returns an error message if quota is exceeded, null if successful
 */
export const saveTodos = (todos: Todo[]): string | null => {
  try {
    const serialized = JSON.stringify(todos);
    window.sessionStorage.setItem(STORAGE_KEY, serialized);
    return null;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('SessionStorage quota exceeded:', error);
      return 'Storage quota exceeded – your latest changes may not be saved.';
    }

    console.error('Failed to save todos to sessionStorage:', error);
    return 'Failed to save your changes to storage.';
  }
};
