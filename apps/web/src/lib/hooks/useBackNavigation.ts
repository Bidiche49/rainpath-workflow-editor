import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Returns a handler that goes back through the browser history (`navigate(-1)`),
 * matching the user's actual entry point — e.g. coming to the editor from the
 * dashboard returns to the dashboard, not to a hardcoded list route.
 *
 * When there is no history to go back to (direct link, fresh tab), it falls
 * back to a sensible default route instead of leaving the user stranded.
 */
export function useBackNavigation(fallback: string): () => void {
  const navigate = useNavigate();
  return useCallback(() => {
    if (window.history.length > 1) navigate(-1);
    else navigate(fallback);
  }, [navigate, fallback]);
}
