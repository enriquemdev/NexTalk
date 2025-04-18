"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Send } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useDebounce } from "use-debounce";
import { toast } from "sonner";
import { CheckedState } from "@radix-ui/react-checkbox";

interface InviteUsersProps {
  roomId: Id<"rooms">;
  trigger?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

interface SearchUser {
  _id: Id<"users">;
  name?: string;
  email?: string;
}

const emailSchema = z.string().email();

export function InviteUsers({ roomId, trigger, onClose, className }: InviteUsersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  
  // Email invite state
  const [email, setEmail] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  
  // User search state
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [selectedUsers, setSelectedUsers] = useState<SearchUser[]>([]);
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  // Get all users when no search query is provided
  const allUsers = useQuery(api.users.listUsers, { limit: 20 });
  
  // Use search results when a search query is provided
  const searchResults = useQuery(
    api.users.searchUsers,
    debouncedSearchQuery ? { searchQuery: debouncedSearchQuery, limit: 10 } : "skip"
  );

  // Determine which user list to display
  const displayUsers = debouncedSearchQuery ? searchResults : allUsers;
  const isSearching = (debouncedSearchQuery && searchResults === undefined) || 
                      (!debouncedSearchQuery && allUsers === undefined);

  const handleUserSelect = (user: SearchUser, checked: CheckedState | boolean) => {
    setSelectedUsers(prev => 
      checked 
        ? [...prev, user] 
        : prev.filter(u => u._id !== user._id)
    );
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailLoading(true);

    try {
      emailSchema.parse(email);
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          roomId,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send invitation");
      }

      toast.success(`Invitation sent to ${email}`);
      setEmail("");
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send invitation");
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return;

    setIsSendingInvites(true);
    let successCount = 0;
    let errorCount = 0;

    const invitePromises = selectedUsers.map(user => {
      if (!user.email) {
        console.warn(`User ${user.name || user._id} has no email, skipping invite.`);
        errorCount++;
        return Promise.resolve();
      }
      return fetch('/api/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          email: user.email,
        }),
      })
      .then(response => {
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
          console.error(`Failed to invite ${user.email}:`, response.statusText);
          return response.json();
        }
      })
      .catch(error => {
        errorCount++;
        console.error(`Error inviting ${user.email}:`, error);
      });
    });

    await Promise.all(invitePromises);
    setIsSendingInvites(false);

    if (successCount > 0) {
      toast.success(`${successCount} invitation(s) sent successfully.`);
      handleClose();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} invitation(s) failed to send. Check console for details.`);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setEmail("");
    setSearchQuery("");
    setSelectedUsers([]);
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" className={className}>Invite</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Room</DialogTitle>
          <DialogDescription>
            Invite users to join this room. They will receive an email with a link to join.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">Invite Users</TabsTrigger>
            <TabsTrigger value="email">Invite by Email</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user-search">Search Users</Label>
                <Input 
                  id="user-search"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <ScrollArea className="h-[200px] w-full rounded-md border p-2">
                {isSearching && (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!isSearching && displayUsers && displayUsers.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">No users found.</p>
                )}
                {!isSearching && displayUsers && displayUsers.length > 0 && (
                  <ul className="space-y-2">
                    {displayUsers.map((user) => (
                      <li key={user._id} className="flex items-center space-x-3 p-2 rounded hover:bg-muted">
                        <Checkbox 
                          id={`user-${user._id}`}
                          checked={selectedUsers.some(u => u._id === user._id)}
                          onCheckedChange={(checked) => handleUserSelect(user, checked)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{(user.name?.[0] || 'U').toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <label htmlFor={`user-${user._id}`} className="flex-1 cursor-pointer">
                          <p className="text-sm font-medium leading-none">{user.name || 'Unnamed User'}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email ? user.email : 'No email available'}
                          </p>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>

            <DialogFooter className="mt-4">
              <Button
                onClick={handleClose}
                variant="ghost"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSendInvites}
                disabled={selectedUsers.length === 0 || isSendingInvites}
              >
                {isSendingInvites ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send Invites
                  </>
                )}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isEmailLoading}
                >
                  {isEmailLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
} 