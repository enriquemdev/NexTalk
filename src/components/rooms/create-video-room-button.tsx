"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useRouter } from "next/navigation";
import { randomString } from "@/lib/client-utils";
import { VideoIcon, Copy, Send, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Id } from "../../../convex/_generated/dataModel";

interface SearchUser {
  _id: Id<"users">;
  name?: string;
  email?: string;
}

export function CreateVideoRoomButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const router = useRouter();
  const createRoom = useMutation(api.rooms.create);
  const { userId } = useCurrentUser();

  // User search and invitation state
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

  const handleCopyCode = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode)
        .then(() => {
          toast.success("Access code copied to clipboard!");
        })
        .catch(err => {
          console.error("Failed to copy code:", err);
          toast.error("Failed to copy code.");
        });
    }
  };

  const handleCreateRoom = async () => {
    if (!userId) {
      toast.error("You must be logged in to create a room");
      setIsOpen(false);
      return;
    }

    setIsCreating(true);
    setCreatedRoomId(null);
    setAccessCode(null);

    let finalRoomName = roomName.trim() || randomString(8);
    if (finalRoomName === 'undefined' || finalRoomName === '') {
      finalRoomName = randomString(8);
    }
    finalRoomName = finalRoomName
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase();
    if (!finalRoomName) {
      finalRoomName = randomString(8);
    }

    console.log(`Attempting to create ${isPrivate ? 'private' : 'public'} video room:`, finalRoomName);

    try {
      const result = await createRoom({
        name: finalRoomName,
        userId: userId,
        isPrivate: isPrivate,
        type: 'video',
      });

      toast.success("Room created successfully!");
      setIsOpen(false);
      setRoomName("");
      setIsPrivate(false);
      setCreatedRoomId(result.roomId);

      if (result.accessCode) {
        setAccessCode(result.accessCode);
        setShowAccessCodeDialog(true);
      } else {
        router.push(`/video-rooms/${result.roomId}`);
      }

    } catch (error: unknown) {
      console.error("Failed to create room via Convex:", error);
      toast.error("Failed to create room. Please try again.");
      setCreatedRoomId(null);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUserSelect = (user: SearchUser, checked: CheckedState | boolean) => {
    setSelectedUsers(prev => 
      checked 
        ? [...prev, user] 
        : prev.filter(u => u._id !== user._id)
    );
  };

  const handleSendInvites = async () => {
    if (!createdRoomId || selectedUsers.length === 0) return;

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
          roomId: createdRoomId,
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
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} invitation(s) failed to send. Check console for details.`);
    }
  };

  const handleAccessCodeDialogClose = () => {
    setShowAccessCodeDialog(false);
    if (createdRoomId) {
      router.push(`/video-rooms/${createdRoomId}`);
      setAccessCode(null);
      setCreatedRoomId(null);
      setSearchQuery("");
      setSelectedUsers([]);
    } else {
      console.error("Room ID not available for redirection after closing access code dialog.");
      router.push('/');
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          setRoomName("");
          setIsPrivate(false);
          setCreatedRoomId(null);
          setAccessCode(null);
        }
      }}>
        <DialogTrigger asChild>
          <Button variant="secondary" className="flex items-center gap-2">
            <VideoIcon className="w-4 h-4" />
            New Video Room
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Video Room</DialogTitle>
            <DialogDescription>
              Start a new video conference. You can invite others by sharing the room link.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomName">Room Name (Optional)</Label>
                <Input
                  id="roomName"
                  placeholder="Leave blank for random name"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is-private-video"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="is-private-video">Private Room (requires access code)</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleCreateRoom}
              disabled={isCreating}
            >
              {isCreating ? "Creating..." : "Create Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showAccessCodeDialog} onOpenChange={setShowAccessCodeDialog}>
          <AlertDialogContent className="max-w-2xl w-full">
              <AlertDialogHeader>
                  <AlertDialogTitle>Private Room Created!</AlertDialogTitle>
                  <AlertDialogDescription>
                      Share this access code with users you want to invite to your private room.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex items-center space-x-2 bg-muted p-3 rounded-md">
                  <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold flex-grow">
                      {accessCode}
                  </code>
                  <Button variant="ghost" size="icon" onClick={handleCopyCode}>
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Copy Access Code</span>
                  </Button>
              </div>

              <div className="space-y-3 pt-4">
                <Label htmlFor="user-search">Invite Registered Users</Label>
                <div className="flex space-x-2">
                    <Input 
                        id="user-search"
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <Button 
                        onClick={handleSendInvites}
                        disabled={selectedUsers.length === 0 || isSendingInvites}
                        size="icon"
                    >
                        {isSendingInvites ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        <span className="sr-only">Send Invites</span>
                    </Button>
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

              <AlertDialogFooter>
                  <AlertDialogAction onClick={handleAccessCodeDialogClose}>Got it! Go to Room</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 