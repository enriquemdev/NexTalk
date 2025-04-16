import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Id } from "convex/_generated/dataModel";
import { UserProfileContent } from "@/components/core/user-profile";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface RoomParticipantsProps {
  roomId: Id<"rooms">;
}

export function RoomParticipants({ roomId }: RoomParticipantsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const participants = useQuery(api.rooms.getParticipants, { roomId });
  const users = useQuery(api.users.getMultiple, {
    userIds: participants?.map((p) => p.userId) ?? [],
  });

  const participantsWithUser = participants?.map((participant) => ({
    ...participant,
    user: users?.find((u) => u?._id === participant.userId),
  }));

  // Group participants by role
  const groupedParticipants = participantsWithUser?.reduce(
    (acc, participant) => {
      if (!participant.leftAt) {
        // Only include active participants
        const role = participant.role;
        if (!acc[role]) {
          acc[role] = [];
        }
        acc[role].push(participant);
      }
      return acc;
    },
    {} as Record<string, typeof participantsWithUser>
  );

  // Sort roles in order of importance
  const roleOrder = ["host", "co-host", "speaker", "listener"];
  const sortedRoles = Object.keys(groupedParticipants ?? {}).sort(
    (a, b) => roleOrder.indexOf(a) - roleOrder.indexOf(b)
  );

  const getRoleTitle = (role: string) => {
    switch (role) {
      case "host":
        return "Host";
      case "co-host":
        return "Co-hosts";
      case "speaker":
        return "Speakers";
      case "listener":
        return "Listeners";
      default:
        return role;
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
          <Users className="h-4 w-4 mr-2" />
          Participants
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Room Participants</SheetTitle>
          <SheetDescription>
            {participants?.filter((p) => !p.leftAt).length} people in the room
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-8rem)] mt-8">
          {sortedRoles.map((role) => (
            <div key={role} className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3 mx-5">
                {getRoleTitle(role)} ({groupedParticipants?.[role]?.length ?? 0}
                )
              </h3>
              <div className="space-y-4">
                {groupedParticipants?.[role]?.map(
                  (participant) =>
                    participant.user && (
                      <div key={participant._id}>
                        <UserProfileContent
                          variant="inline"
                          selectedUser={participant.user}
                          avatarSize="sm"
                          showFollowButton={true}
                          className="px-2"
                        />
                        <Separator className="mt-4" />
                      </div>
                    )
                )}
              </div>
            </div>
          ))}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
