import { Button } from "@/components/ui/button";
import { Clock, Video, Mic, Users, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { SummaryRoomModal } from "./summary-room-modal";

interface MeetingHeaderProps {
  title: string;
  startTime: string;
  endTime: string;
  status: string;
}

export const RoomHeader = ({
  title,
  startTime,
  endTime,
  status,
}: MeetingHeaderProps) => {
  return (
    <header className="border-b border-gray-200 bg-background p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          <div className="flex items-center text-sm text-secondary-foreground mt-1">
            <Clock className="h-4 w-4 mr-1" />
            <span className="mr-4">
              {startTime} - {endTime}
            </span>
            <Badge
              className={status === "live" ? "bg-green-500" : "bg-gray-500"}
            >
              {status === "live"
                ? "Live"
                : status === "scheduled"
                  ? "Scheduled"
                  : "Ended"}
            </Badge>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <SummaryRoomModal />

          <Button variant="outline" size="icon">
            <Mic className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon">
            <Video className="h-4 w-4" />
          </Button>
          <Button variant="default" className="bg-blue-600 hover:bg-blue-700">
            <Users className="h-4 w-4 mr-2" />
            Participants
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Meeting settings</DropdownMenuItem>
              <DropdownMenuItem>Share meeting</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                End meeting
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
