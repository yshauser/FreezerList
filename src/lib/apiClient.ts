// API client - calls backend instead of Google API directly
import type { Entry } from '../types';

const BASE_URL = ''; // Same origin (nginx proxy)

// Helper to handle fetch errors
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Check authentication status
export async function checkAuthStatus(): Promise<{ authenticated: boolean }> {
  const response = await fetch(`${BASE_URL}/auth/status`, {
    credentials: 'include', // Send cookies
  });
  return handleResponse(response);
}

// Get sheet ID
export async function getSheetId(): Promise<number> {
  const response = await fetch(`${BASE_URL}/api/sheet-id`, {
    credentials: 'include',
  });
  const data = await handleResponse<{ sheetId: number }>(response);
  return data.sheetId;
}

// Read all entries
export async function readEntries(): Promise<Entry[]> {
  const response = await fetch(`${BASE_URL}/api/entries`, {
    credentials: 'include',
  });
  return handleResponse(response);
}

// Append new entry
export async function appendEntry(entry: Omit<Entry, 'id'> & { id?: string }): Promise<{ id: string }> {
  const response = await fetch(`${BASE_URL}/api/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(entry),
  });
  return handleResponse(response);
}

// Update entry by ID
export async function updateEntryById(id: string, entry: Entry): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/entries/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(entry),
  });
  await handleResponse(response);
}

// Delete entry by ID
export async function deleteEntryById(id: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/entries/${id}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  await handleResponse(response);
}

// Logout
export async function logout(): Promise<void> {
  const response = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
  await handleResponse(response);
}
