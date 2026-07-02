import { useQuery } from '@tanstack/react-query';

import { API_URL } from '@/lib/api';

async function fetchApiHealth(): Promise<string> {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: fetchApiHealth,
  });
}
