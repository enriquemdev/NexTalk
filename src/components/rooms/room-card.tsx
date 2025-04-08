import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";

interface RoomCardProps {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

export function RoomCard({ id, name, description, createdAt }: RoomCardProps) {
  const router = useRouter();

  return (
    <Card className="w-full hover:bg-accent/50 transition-colors cursor-pointer" onClick={() => router.push(`/room/${id}`)}>
      <CardHeader>
        <CardTitle className="text-xl">{name}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Created {formatDistanceToNow(createdAt, { addSuffix: true })}
        </p>
        <Button variant="secondary" className="mt-4 w-full">
          Join Room
        </Button>
      </CardContent>
    </Card>
  );
}