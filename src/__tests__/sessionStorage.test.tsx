import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadTodos, saveTodos, isValidTodo, isValidTodos } from '../utils/sessionStorage';
import type { Todo } from '../types/Todo';

// Mock sessionStorage
const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
};

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

// Helper to create a valid todo
const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
  id: 'test-id',
  title: 'Test Todo',
  description: 'Test Description',
  completed: false,
  createdAt: new Date('2024-01-01'),
  ...overrides,
});

describe('sessionStorage utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isValidTodo', () => {
    it('should return true for valid todo objects', () => {
      const validTodo = createTodo();
      expect(isValidTodo(validTodo)).toBe(true);
    });

    it('should return true for todo with createdAt as string', () => {
      const validTodoWithStringDate = {
        ...createTodo(),
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      expect(isValidTodo(validTodoWithStringDate)).toBe(true);
    });

    it('should return false for objects missing required fields', () => {
      expect(isValidTodo({})).toBe(false);
      expect(isValidTodo({ id: 'test' })).toBe(false);
      expect(isValidTodo({ id: 'test', title: 'Test' })).toBe(false);
      expect(isValidTodo({ id: 'test', title: 'Test', description: 'Desc' })).toBe(false);
      expect(isValidTodo({ id: 'test', title: 'Test', description: 'Desc', completed: true })).toBe(
        false
      );
    });

    it('should return false for invalid field types', () => {
      expect(isValidTodo({ ...createTodo(), id: 123 })).toBe(false);
      expect(isValidTodo({ ...createTodo(), title: 123 })).toBe(false);
      expect(isValidTodo({ ...createTodo(), description: 123 })).toBe(false);
      expect(isValidTodo({ ...createTodo(), completed: 'true' })).toBe(false);
      expect(isValidTodo({ ...createTodo(), createdAt: 123 })).toBe(false);
    });

    it('should return false for non-objects', () => {
      expect(isValidTodo(null)).toBe(false);
      expect(isValidTodo(undefined)).toBe(false);
      expect(isValidTodo('string')).toBe(false);
      expect(isValidTodo(123)).toBe(false);
      expect(isValidTodo([])).toBe(false);
    });
  });

  describe('isValidTodos', () => {
    it('should return true for valid todo arrays', () => {
      const validTodos = [createTodo(), createTodo({ id: 'test-2' })];
      expect(isValidTodos(validTodos)).toBe(true);
    });

    it('should return true for empty arrays', () => {
      expect(isValidTodos([])).toBe(true);
    });

    it('should return false for non-arrays', () => {
      expect(isValidTodos(null)).toBe(false);
      expect(isValidTodos({})).toBe(false);
      expect(isValidTodos('string')).toBe(false);
    });

    it('should return false for arrays containing invalid todos', () => {
      const invalidTodos = [createTodo(), { invalid: 'todo' }];
      expect(isValidTodos(invalidTodos)).toBe(false);
    });
  });

  describe('loadTodos', () => {
    it('should return empty array when no data exists', () => {
      mockSessionStorage.getItem.mockReturnValue(null);
      expect(loadTodos()).toEqual([]);
    });

    it('should load and parse valid todos', () => {
      const todos = [createTodo(), createTodo({ id: 'test-2' })];
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(todos));
      expect(loadTodos()).toEqual(todos);
    });

    it('should convert string dates to Date objects', () => {
      const todoWithStringDate = {
        ...createTodo(),
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify([todoWithStringDate]));

      const result = loadTodos();
      expect(result[0].createdAt).toBeInstanceOf(Date);
      expect(result[0].createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('should handle invalid JSON and clear storage', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      mockSessionStorage.getItem.mockReturnValue('invalid json');

      const result = loadTodos();

      expect(result).toEqual([]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('todos');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load todos from sessionStorage:',
        expect.any(SyntaxError)
      );
    });

    it('should handle corrupted data and clear storage', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const invalidData = [{ invalid: 'data' }];
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(invalidData));

      const result = loadTodos();

      expect(result).toEqual([]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('todos');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Corrupted todo data found in sessionStorage, clearing...'
      );
    });

    it('should handle sessionStorage access errors', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const error = new Error('Storage access denied');
      mockSessionStorage.getItem.mockImplementation(() => {
        throw error;
      });

      const result = loadTodos();

      expect(result).toEqual([]);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('todos');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to load todos from sessionStorage:',
        error
      );
    });
  });

  describe('saveTodos', () => {
    it('should save todos successfully', () => {
      const todos = [createTodo()];
      const result = saveTodos(todos);

      expect(result).toBeNull();
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith('todos', JSON.stringify(todos));
    });

    it('should handle QuotaExceededError', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const quotaError = new Error('Quota exceeded');
      quotaError.name = 'QuotaExceededError';
      mockSessionStorage.setItem.mockImplementation(() => {
        throw quotaError;
      });

      const todos = [createTodo()];
      const result = saveTodos(todos);

      expect(result).toBe('Storage quota exceeded – your latest changes may not be saved.');
      expect(consoleWarnSpy).toHaveBeenCalledWith('SessionStorage quota exceeded:', quotaError);
    });

    it('should handle other storage errors', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const genericError = new Error('Generic storage error');
      mockSessionStorage.setItem.mockImplementation(() => {
        throw genericError;
      });

      const todos = [createTodo()];
      const result = saveTodos(todos);

      expect(result).toBe('Failed to save your changes to storage.');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save todos to sessionStorage:',
        genericError
      );
    });

    it('should serialize complex todo objects', () => {
      const complexTodo = createTodo({
        title: 'Complex Todo',
        description: 'With special chars: áéíóú & symbols!',
        createdAt: new Date('2024-02-15T10:30:00Z'),
      });

      saveTodos([complexTodo]);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'todos',
        JSON.stringify([complexTodo])
      );
    });
  });
});
