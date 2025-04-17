import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { PlusIcon } from "lucide-react";

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

  const onSubmit = async (data: FormValues) => {
    try {
      if (!userId) {
        toast.error("You must be logged in to create a room");
        return;
      }

      const roomId = await createRoom({
        name: data.name,
        description: data.description,
        userId: userId,
      });

      toast.success("Room created successfully!");

      setOpen(false);
      form.reset();
      router.push(`/room/${roomId}`);
    } catch (error: unknown) {
      console.error("Failed to create room:", error);
      toast.error("Failed to create room. Please try again.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="rounded-md text-xs font-medium p-0 px-2"
        >
          <PlusIcon className="size-3" />
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
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Create Room</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
