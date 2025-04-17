import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { type CheckedState } from "@radix-ui/react-checkbox";
import { Id } from "../../convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem, 
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { Copy, Loader2, Send } from "lucide-react";
import { useDebounce } from "use-debounce";

interface SearchUser {
  _id: Id<"users">;
  name?: string;
  email?: string;
}

const formSchema = z.object({
  name: z
    .string()
    .min(1, "Room name is required")
    .max(50, "Room name is too long"),
  description: z.string().max(200, "Description is too long").optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function CreateRoomForm() {
  const [open, setOpen] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [showAccessCodeDialog, setShowAccessCodeDialog] = useState(false);
  const [createdRoomId, setCreatedRoomId] = useState<Id<"rooms"> | null>(null);
  const createRoom = useMutation(api.rooms.create);
  const router = useRouter();
  const { userId } = useCurrentUser();

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

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });

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

  const onSubmit = async (data: FormValues) => {
    if (!userId) {
      toast.error("You must be logged in to create a room");
      return;
    }

    try {
      const result = await createRoom({
        name: data.name,
        description: data.description,
        userId: userId,
        isPrivate: isPrivate,
        type: "audio",
      });

      toast.success("Room created successfully!");
      setOpen(false);
      form.reset();
      setCreatedRoomId(result.roomId);
      setSearchQuery("");
      setSelectedUsers([]);

      if (isPrivate && result.accessCode) {
        setAccessCode(result.accessCode);
        setShowAccessCodeDialog(true);
      } else {
        router.push(`/room/${result.roomId}`);
      }

    } catch (error: unknown) {
      console.error("Failed to create room:", error);
      toast.error("Failed to create room. Please try again.");
      setCreatedRoomId(null);
    }
  };

  const handleAccessCodeDialogClose = () => {
    setShowAccessCodeDialog(false);
    if (createdRoomId) {
      router.push(`/room/${createdRoomId}`);
      setAccessCode(null);
      setCreatedRoomId(null);
      setSearchQuery("");
      setSelectedUsers([]);
    } else {
      console.error("Room ID not available for redirection after closing access code dialog.");
      router.push('/');
    }
  }

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

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="default" className="rounded-md">
            Create Room
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Room</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Room Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter room name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter room description"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center space-x-2 pt-2">
                <Switch
                  id="is-private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="is-private">Private Room (requires access code)</Label>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setOpen(false);
                    form.reset();
                    setIsPrivate(false);
                    setCreatedRoomId(null);
                    setSearchQuery("");
                    setSelectedUsers([]);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {form.formState.isSubmitting ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showAccessCodeDialog} onOpenChange={setShowAccessCodeDialog}>
          <AlertDialogContent className="max-w-2xl w-full">
              <AlertDialogHeader>
                  <AlertDialogTitle>Private Room Created!</AlertDialogTitle>
                  <AlertDialogDescription>
                      Share the access code below or invite registered users directly.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              
              <div className="space-y-2">
                  <Label htmlFor="access-code">Access Code</Label>
                  <div className="flex items-center space-x-2 bg-muted p-3 rounded-md">
                      <code id="access-code" className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold flex-grow break-all">
                          {accessCode}
                      </code>
                      <Button variant="ghost" size="icon" onClick={handleCopyCode} disabled={!accessCode}>
                          <Copy className="h-4 w-4" />
                          <span className="sr-only">Copy Access Code</span>
                      </Button>
                  </div>
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
                  <AlertDialogAction onClick={handleAccessCodeDialogClose}>Done</AlertDialogAction> 
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
