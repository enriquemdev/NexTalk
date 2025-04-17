"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { toast } from "sonner";

export default function ResetUsersPage() {
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; deletedCount: number; message: string } | null>(null);
  
  const deleteAllUsers = useMutation(api.users.deleteAllUsers);
  
  const handleReset = async () => {
    if (confirmationText !== "ERASE_ALL_USERS_CONFIRM") {
      toast.error("Please enter the correct confirmation phrase");
      return;
    }
    
    try {
      setIsDeleting(true);
      const result = await deleteAllUsers({ confirmationPhrase: confirmationText });
      setResult(result);
      toast.success(`Successfully deleted ${result.deletedCount} users`);
    } catch (error) {
      console.error("Failed to delete users:", error);
      toast.error("Failed to delete users. See console for details.");
    } finally {
      setIsDeleting(false);
      setConfirmationText("");
    }
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Admin: Reset Users Database</h1>
      
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Warning: Destructive Action</AlertTitle>
        <AlertDescription>
          This action will permanently delete all users from the database. 
          This cannot be undone. Use only in development environments.
        </AlertDescription>
      </Alert>
      
      <Card>
        <CardHeader>
          <CardTitle>Delete All Users</CardTitle>
          <CardDescription>
            This will erase all user records from the database. Users will need to sign in again
            to recreate their accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">
                To confirm, type <code className="bg-muted p-1 text-sm">ERASE_ALL_USERS_CONFIRM</code> below:
              </p>
              <Input
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="Type confirmation phrase"
                className="max-w-md"
              />
            </div>
            
            {result && (
              <div className={`p-3 rounded-md ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                <p>{result.message}</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            variant="destructive" 
            onClick={handleReset}
            disabled={isDeleting || confirmationText !== "ERASE_ALL_USERS_CONFIRM"}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting Users...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete All Users
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 