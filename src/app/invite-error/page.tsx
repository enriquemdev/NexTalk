import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface InviteErrorPageProps {
  searchParams: {
    reason?: string;
  };
}

export default function InviteErrorPage({ searchParams }: InviteErrorPageProps) {
  const { reason = 'unknown' } = searchParams;

  const errorMessages = {
    'invalid': 'This invitation link is invalid or has expired.',
    'room-not-found': 'The room you were invited to no longer exists.',
    'server-error': 'There was a problem processing your invitation.',
    'unknown': 'Something went wrong with your invitation.',
  };

  const message = errorMessages[reason as keyof typeof errorMessages] || errorMessages.unknown;

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invitation Error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">{message}</p>
          <div className="flex justify-center">
            <Button asChild>
              <Link href="/">
                Return Home
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 