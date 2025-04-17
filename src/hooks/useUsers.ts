import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";

export const useUsers = () => {
  const useGetUsers = (searchQuery: string = "", limit?: number) => {
    const users = useQuery(api.users.searchUsers, { searchQuery, limit });
    return users;
  };

  return {
    useGetUsers,
  };
};
