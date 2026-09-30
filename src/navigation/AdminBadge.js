import { createContext, useContext } from 'react';

export const AdminBadgeContext = createContext({
  pendingClubCount: 0,
  refreshPendingClubCount: async () => {},
});

export const useAdminBadge = () => useContext(AdminBadgeContext);
