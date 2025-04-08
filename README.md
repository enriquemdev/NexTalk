# NextTalk

NextTalk is a next-generation, real-time audio discussion platform designed to facilitate live audio conversations, drawing inspiration from Twitter Spaces while enhancing the experience with AI-driven features and multimedia integrations.

## Features

- **Real-time Audio Discussions**: Host and join live audio conversations
- **Room Management**: Create, browse, and join discussion rooms
- **User Authentication**: Secure authentication powered by Clerk
- **Theme Customization**: Choose between different UI themes
- **Responsive Design**: Mobile-first approach ensuring great experience on all devices
- **Real-time Updates**: Powered by Convex database for instant data synchronization

## Tech Stack

### Frontend
- **Next.js v15** with App Router
- **TypeScript**
- **Tailwind CSS** for styling
- **Shadcn UI** for component library
- **React Hook Form** for form handling
- **Zod** for validation
- **Sonner** for toast notifications

### Backend
- **Convex** for real-time database, authentication, and object storage
- **Next.js API Routes** for server-side logic

### Authentication
- **Clerk** for user authentication and management

### State Management
- **React Context** for global state
- **Convex React** for real-time data synchronization

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- npm, yarn, pnpm, or bun package manager
- Convex account for the backend
- Clerk account for authentication

### Environment Setup
Create a `.env.local` file in the root directory with the following variables:

## Future Roadmap

NextTalk is being developed in a three-phase approach:

1. **Essential MVP**
   - Core audio rooms
   - Basic user interactions
   - Authentication

2. **Polished Features**
   - AI-driven enhancements
   - Real-time translations
   - Session summaries
   - Enhanced multimedia capabilities

3. **Commercial Features**
   - Monetization options
   - Advanced AI integrations
   - Experimental features

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the [MIT License](LICENSE).

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/nextalk.git
   cd nextalk
   ```

2. Install dependencies
   ```bash
   npm install
   # or
   yarn
   # or
   pnpm install
   # or
   bun install
   ```

3. Start the development server
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Convex Setup

1. Start the Convex development server
   ```bash
   npx convex dev
   ```

2. This will start a local Convex development server and prompt you to log in or create an account if needed.

## Project Structure
