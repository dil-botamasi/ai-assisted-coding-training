import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { TodoProvider } from '../contexts/TodoContext';
import { useTodo } from '../hooks/useTodo';
import type { Todo } from '../types/Todo';

// Mock the sessionStorage utilities
vi.mock('../utils/sessionStorage', () => ({
  loadTodos: vi.fn(),
  saveTodos: vi.fn(),
  isValidTodos: vi.fn(),
  isValidTodo: vi.fn(),
}));

import { loadTodos, saveTodos } from '../utils/sessionStorage';

// Type the mocked functions
const mockLoadTodos = loadTodos as ReturnType<typeof vi.fn>;
const mockSaveTodos = saveTodos as ReturnType<typeof vi.fn>;

// Test component that uses the TodoContext
const TestComponent = () => {
  const { todos, addTodo, editTodo, toggleTodoCompletion, deleteTodo } = useTodo();

  return (
    <div>
      <div data-testid="todo-count">{todos.length}</div>
      <div data-testid="todos-json">{JSON.stringify(todos)}</div>
      <button data-testid="add-todo" onClick={() => addTodo('Test Todo', 'Test Description')}>
        Add Todo
      </button>
      <button
        data-testid="edit-todo"
        onClick={() => todos.length > 0 && editTodo(todos[0].id, { title: 'Edited Todo' })}
      >
        Edit Todo
      </button>
      <button
        data-testid="toggle-todo"
        onClick={() => todos.length > 0 && toggleTodoCompletion(todos[0].id)}
      >
        Toggle Todo
      </button>
      <button data-testid="delete-todo" onClick={() => todos.length > 0 && deleteTodo(todos[0].id)}>
        Delete Todo
      </button>
    </div>
  );
};

const mockTodo: Todo = {
  id: 'test-id',
  title: 'Test Todo',
  description: 'Test Description',
  completed: false,
  createdAt: new Date('2024-01-01'),
};

describe('TodoProvider with sessionStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock returns
    mockLoadTodos.mockReturnValue([]);
    mockSaveTodos.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should hydrate todos from sessionStorage on initialization', () => {
    const existingTodos = [mockTodo];
    mockLoadTodos.mockReturnValue(existingTodos);

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    expect(loadTodos).toHaveBeenCalledOnce();
    expect(screen.getByTestId('todo-count')).toHaveTextContent('1');
    // Check the structure rather than exact equality since dates may be serialized differently
    const displayedTodos = JSON.parse(screen.getByTestId('todos-json').textContent!);
    expect(displayedTodos).toHaveLength(1);
    expect(displayedTodos[0]).toMatchObject({
      id: mockTodo.id,
      title: mockTodo.title,
      description: mockTodo.description,
      completed: mockTodo.completed,
    });
  });

  it('should start with empty array when no stored todos exist', () => {
    mockLoadTodos.mockReturnValue([]);

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    expect(loadTodos).toHaveBeenCalledOnce();
    expect(screen.getByTestId('todo-count')).toHaveTextContent('0');
  });

  it('should persist todos to sessionStorage when adding a todo', async () => {
    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await act(async () => {
      screen.getByTestId('add-todo').click();
    });

    await waitFor(() => {
      expect(mockSaveTodos).toHaveBeenCalled();
    });

    expect(screen.getByTestId('todo-count')).toHaveTextContent('1');

    // Find the call that has todos with length > 0 (not the initial empty array save)
    const saveCalls: [Todo[]][] = mockSaveTodos.mock.calls as [Todo[]][];
    const callWithTodos = saveCalls.find(call => call[0].length > 0);
    expect(callWithTodos).toBeDefined();

    const savedTodos = callWithTodos![0];
    expect(savedTodos).toHaveLength(1);
    expect(savedTodos[0]).toMatchObject({
      title: 'Test Todo',
      description: 'Test Description',
      completed: false,
    });
  });

  it('should persist todos to sessionStorage when editing a todo', async () => {
    const existingTodos = [mockTodo];
    mockLoadTodos.mockReturnValue(existingTodos);

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await act(async () => {
      screen.getByTestId('edit-todo').click();
    });

    await waitFor(() => {
      expect(mockSaveTodos).toHaveBeenCalledWith([{ ...mockTodo, title: 'Edited Todo' }]);
    });
  });

  it('should persist todos to sessionStorage when toggling completion', async () => {
    const existingTodos = [mockTodo];
    mockLoadTodos.mockReturnValue(existingTodos);

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await act(async () => {
      screen.getByTestId('toggle-todo').click();
    });

    await waitFor(() => {
      expect(mockSaveTodos).toHaveBeenCalledWith([{ ...mockTodo, completed: true }]);
    });
  });

  it('should persist todos to sessionStorage when deleting a todo', async () => {
    const existingTodos = [mockTodo];
    mockLoadTodos.mockReturnValue(existingTodos);

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await act(async () => {
      screen.getByTestId('delete-todo').click();
    });

    await waitFor(() => {
      expect(mockSaveTodos).toHaveBeenCalledWith([]);
    });

    expect(screen.getByTestId('todo-count')).toHaveTextContent('0');
  });

  it('should show toast when sessionStorage quota is exceeded', async () => {
    mockSaveTodos.mockReturnValue('Storage quota exceeded – your latest changes may not be saved.');

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await act(async () => {
      screen.getByTestId('add-todo').click();
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('Storage quota exceeded – your latest changes may not be saved.')
      ).toBeInTheDocument();
    });
  });

  it('should show toast when other storage errors occur', async () => {
    mockSaveTodos.mockReturnValue('Failed to save your changes to storage.');

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await act(async () => {
      screen.getByTestId('add-todo').click();
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Failed to save your changes to storage.')).toBeInTheDocument();
    });
  });

  it('should not show toast when saving is successful', async () => {
    mockSaveTodos.mockReturnValue(null); // Success case

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    await act(async () => {
      screen.getByTestId('add-todo').click();
    });

    // Wait a bit to ensure toast doesn't appear
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('should persist initial hydrated data to ensure consistency', async () => {
    const existingTodos = [mockTodo];
    mockLoadTodos.mockReturnValue(existingTodos);

    render(
      <TodoProvider>
        <TestComponent />
      </TodoProvider>
    );

    // Initial save should happen after hydration
    await waitFor(() => {
      expect(mockSaveTodos).toHaveBeenCalledWith(existingTodos);
    });
  });
});
