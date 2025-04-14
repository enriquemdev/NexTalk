import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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
import { Copy } from "lucide-react";

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
  const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
  const createRoom = useMutation(api.rooms.create);
  const router = useRouter();
  const { userId } = useCurrentUser();

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
      });

      toast.success("Room created successfully!");
      setOpen(false);
      form.reset();
      setIsPrivate(false);
      setCreatedRoomId(result.roomId);

      if (result.accessCode) {
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
    } else {
      console.error("Room ID not available for redirection after closing access code dialog.");
      router.push('/');
    }
  }

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
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Creating..." : "Create Room"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showAccessCodeDialog} onOpenChange={setShowAccessCodeDialog}>
          <AlertDialogContent>
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
              <AlertDialogFooter>
                  <AlertDialogAction onClick={handleAccessCodeDialogClose}>Got it! Go to Room</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
