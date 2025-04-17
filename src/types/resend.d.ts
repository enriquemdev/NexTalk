declare module 'resend' {
  export interface ResendResponse {
    data: {
      id: string;
      from: string;
      to: string;
      createdAt: string;
    };
    error?: {
      message: string;
      name: string;
      statusCode: number;
    };
  }

  export class Resend {
    constructor(apiKey: string);
    emails: {
      send(options: {
        from: string;
        to: string;
        subject: string;
        html: string;
        reply_to?: string;
      }): Promise<ResendResponse>;
    };
  }
} 