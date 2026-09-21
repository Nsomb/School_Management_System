// src/lib/api.ts
export const getClasses = async (): Promise<Array<{id: string, name: string}>> => {
  const response = await fetch('/api/classes', {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch classes');
  return response.json();
};

export const getSubjects = async (): Promise<Array<{id: string, name: string}>> => {
  const response = await fetch('/api/subjects', {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch subjects');
  return response.json();
};

export const getEvaluations = async (): Promise<Array<{id: string, name: string}>> => {
  const response = await fetch('/api/evaluations', {
    credentials: 'include'
  });
  if (!response.ok) throw new Error('Failed to fetch evaluations');
  return response.json();
};