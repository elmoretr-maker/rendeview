import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/utils/api/apiFetch';

export function useIsMatched(userId) {
  return useQuery({
    queryKey: ['isMatched', userId],
    queryFn: async () => {
      if (!userId) return { isMatched: false };
      
      const res = await apiFetch(`/api/matches/check?userId=${userId}`);
      if (!res.ok) {
        return { isMatched: false };
      }
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}
