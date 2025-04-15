"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "./kbd";
import { useUsers } from "@/hooks/useUsers";
import { UserProfile } from "./user-profile";
import { User } from "@/infrastructure/interfaces/user";

export default function SearchBar() {
  // Sample user data
  const [users, setUsers] = useState<User[]>([]);

  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { useGetUsers } = useUsers();

  const getUsers = useGetUsers();
  useEffect(() => {
    if (getUsers) {
      setUsers(getUsers);
    }
  }, [getUsers]);

  // Handle search bar click
  const handleSearchClick = () => {
    setIsCommandOpen(true);
  };

  // Handle user selection from command menu
  const handleUserSelect = (user: User) => {
    setSelectedUser(user);
    setIsCommandOpen(false);
    setIsModalOpen(true);
  };

  // Focus the input when the command dialog opens
  useEffect(() => {
    if (isCommandOpen) {
      // The CommandInput will auto-focus
    }
  }, [isCommandOpen]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsCommandOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  if (!getUsers) return null;

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="">
        <div className="relative flex items-center">
          <div className="relative flex-1" onClick={handleSearchClick}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search users..."
              className="pl-10 cursor-pointer pr-20"
              readOnly
            />
          </div>
          <div className="absolute right-3 flex items-center gap-1 pointer-events-none">
            <Kbd className="text-xs">
              {navigator.platform.indexOf("Mac") === 0 ? "⌘" : "Ctrl"}
            </Kbd>
            <span className="text-xs text-muted-foreground">+</span>
            <Kbd className="text-xs">K</Kbd>
          </div>
        </div>
      </div>

      <CommandDialog open={isCommandOpen} onOpenChange={setIsCommandOpen}>
        <CommandInput placeholder="Search users by name..." />
        <CommandList>
          <CommandEmpty>No users found.</CommandEmpty>
          <CommandGroup heading="Users">
            {users.map((user) => (
              <CommandItem
                key={user._id}
                onSelect={() => handleUserSelect(user)}
                className="flex items-center py-2 px-3 cursor-pointer"
              >
                <Avatar className="h-8 w-8 mr-3">
                  <AvatarImage
                    src={user.image || "/placeholder.svg"}
                    alt={user.name}
                  />
                  <AvatarFallback>
                    {user.name?.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-xs text-muted-foreground">
                    @{user.name?.replaceAll(/\s/g, "").toLowerCase()}
                  </div>
                </div>
                <Badge variant="outline" className="ml-auto">
                  Following
                </Badge>
                {/* {user.isFollowing && (
                )} */}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {selectedUser && (
        <UserProfile
          isModalOpen={isModalOpen}
          selectedUser={selectedUser}
          setIsModalOpen={setIsModalOpen}
        />
      )}
    </div>
  );
}
