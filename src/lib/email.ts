import { Resend } from 'resend';

// Initialize Resend with API key
const resend = new Resend(process.env.RESEND_API_KEY || '');

interface SendRoomInviteEmailParams {
  to: string;
  inviterName: string;
  roomName: string;
  inviteLink: string;
}

export async function sendRoomInviteEmail({
  to,
  inviterName,
  roomName,
  inviteLink,
}: SendRoomInviteEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }

  try {
    const { data, error } = await resend.emails.send({
      from: 'NexTalk <invites@nextalk.app>',
      to: to,
      subject: `${inviterName} invited you to join "${roomName}" on NexTalk`,
      html: `
        <div>
          <h2>You've been invited to join a room on NexTalk!</h2>
          <p>${inviterName} has invited you to join the room "${roomName}".</p>
          <p>Click the link below to join the conversation:</p>
          <a href="${inviteLink}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Join Room
          </a>
          <p>This link will expire after use or in 24 hours.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Failed to send invitation email:', error);
    throw error;
  }
} 