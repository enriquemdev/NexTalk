import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialize Resend with API key
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Error response helper function
const errorResponse = (message: string, status = 400) => {
  return NextResponse.json(
    { success: false, message },
    { status }
  );
};

export async function POST(request: Request) {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.error('Resend API key is not configured');
      return errorResponse('Email service is not configured', 500);
    }

    // Parse request body
    const body = await request.json();
    const { email, roomName, hostName, roomId } = body;

    // Validate required fields
    if (!email) {
      return errorResponse('Email is required');
    }
    
    // At least one of roomName or roomId must be provided
    if (!roomName && !roomId) {
      return errorResponse('Room information is required');
    }

    // Generate invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl = roomName 
      ? `${baseUrl}/video-rooms/${roomName}`
      : `${baseUrl}/rooms/${roomId}`;

    // Build email content
    const subject = `${hostName || 'Someone'} invited you to a NexTalk video call`;
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0f172a; margin-bottom: 16px;">You've been invited to a NexTalk video call</h2>
        <p style="color: #64748b; margin-bottom: 24px;">
          ${hostName || 'Someone'} has invited you to join a video call on NexTalk.
        </p>
        <div style="margin-bottom: 32px;">
          <a href="${inviteUrl}" 
             style="background-color: #3b82f6; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; font-weight: bold;">
            Join Call
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">
          Or copy this link into your browser: <span style="color: #0f172a;">${inviteUrl}</span>
        </p>
      </div>
    `;

    try {
      // Send the email - use a verified domain from Resend dashboard
      const { data, error } = await resend.emails.send({
        from: 'NexTalk <invites@arturomejia.dev>', // Using custom verified domain
        to: email,
        subject,
        html,
      });

      if (error) {
        console.error('Error sending email with Resend:', error);
        return errorResponse(`Failed to send invitation: ${error.message}`, 500);
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Invitation sent successfully',
        data
      });
    } catch (emailError) {
      console.error('Exception sending email:', emailError);
      return errorResponse(`Email sending error: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`, 500);
    }
  } catch (error) {
    console.error('Error processing invitation:', error);
    return errorResponse(`Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
  }
} 