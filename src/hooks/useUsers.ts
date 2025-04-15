import { api } from "convex/_generated/api";
import { useQuery } from "convex/react";

export const useUsers = () => {
  const useGetUsers = () => {
    const users = useQuery(api.users.search);
    return users;
  };
  return {
    useGetUsers,
  };
};
