import { useEffect, useState } from "react";
import { travelService, TravelRole } from "@/services/travelService";

/**
 * Loads the current user's travel role from the backend.
 * Falls back to 'employee' on failure.
 */
export const useTravelRole = (currentUser: any) => {
  const [travelRole, setTravelRole] = useState<TravelRole>('employee');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await travelService.getMyTravelRole();
        if (!cancelled && r?.success) {
          setTravelRole(r.travel_role || 'employee');
        }
      } catch (e) {
        console.error('[useTravelRole] failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    if (currentUser?.email) load();
    return () => { cancelled = true; };
  }, [currentUser?.email]);

  return { travelRole, setTravelRole, loading };
};
