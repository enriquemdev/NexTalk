'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Mail, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useRoomContext } from '@livekit/components-react';
import { useQuery } from 'convex/react';
import { api } from 'convex/_generated/api';
import { Id } from 'convex/_generated/dataModel';

interface User {
  _id: Id<"users">;
  name?: string;
  email?: string;
  imageUrl?: string;
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomName: string;
}

export function InviteModal({ isOpen, onClose, roomName }: InviteModalProps) {
  const [manualEmail, setManualEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState('users');
  
  const room = useRoomContext();
  
  // Fetch users from Convex
  const users = useQuery(api.users.listUsers, { limit: 50 }) || [];
  
  // Filter users based on search query
  const filteredUsers = searchQuery.trim() === '' 
    ? users 
    : users.filter((user: User) => 
        (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  // Toggle user selection
  const toggleUserSelection = (user: User) => {
    if (selectedUsers.some(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  // Clear selections when modal closes
  useEffect(() => {
    if (!isOpen) {
      setManualEmail('');
      setSearchQuery('');
      setSelectedUsers([]);
    }
  }, [isOpen]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (activeTab === 'email' && !manualEmail.trim()) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (activeTab === 'users' && selectedUsers.length === 0) {
      toast.error('Please select at least one user');
      return;
    }
    
    setIsSending(true);
    
    try {
      // Send invitations to selected users or manual email
      if (activeTab === 'users') {
        // Map selected users to their emails, filtering out any undefined emails
        const emails = selectedUsers
          .map(user => user.email)
          .filter((email): email is string => !!email);
          
        if (emails.length === 0) {
          throw new Error('No valid email addresses found');
        }
        
        // Send invitations to each email
        await Promise.all(emails.map(async (email) => {
          await sendInvitation(email);
        }));
        
        toast.success(`Invitations sent to ${emails.length} users`);
      } else {
        // Send to manually entered email
        await sendInvitation(manualEmail.trim());
        toast.success(`Invitation sent to ${manualEmail}`);
      }
      
      // Reset state and close modal
      setManualEmail('');
      setSelectedUsers([]);
      onClose();
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation. Please try again.');
    } finally {
      setIsSending(false);
    }
  };
  
  // Helper function to send invitation to a single email
  const sendInvitation = async (email: string) => {
    const response = await fetch('/api/invite', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        roomName,
        hostName: room.localParticipant.identity,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send invitation to ${email}`);
    }
    
    return response.json();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to Room</DialogTitle>
          <DialogDescription>
            Send an email invitation to join this video room.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="users" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="users">
              <Users className="mr-2 h-4 w-4" />
              App Users
            </TabsTrigger>
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              Email
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-4">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <ScrollArea className="h-[240px] rounded-md border p-2">
                {filteredUsers.length > 0 ? (
                  <div className="space-y-2">
                    {filteredUsers.map((user: User) => (
                      <div 
                        key={user._id}
                        className="flex items-center space-x-2 rounded-md p-2 hover:bg-accent cursor-pointer"
                        onClick={() => toggleUserSelection(user)}
                      >
                        <Checkbox
                          checked={selectedUsers.some(u => u._id === user._id)}
                          onCheckedChange={() => toggleUserSelection(user)}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.imageUrl} />
                          <AvatarFallback>
                            {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || 'Unnamed User'}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email || 'No email available'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-center">
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? 'No users found' : 'No users available'}
                    </p>
                  </div>
                )}
              </ScrollArea>
              
              {selectedUsers.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="email" className="mt-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                required
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSendInvite} disabled={isSending}>
            {isSending ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 