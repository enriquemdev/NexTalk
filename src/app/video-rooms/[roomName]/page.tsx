import VideoRoom from './video-room';

// Mark as dynamic
export const dynamic = 'force-dynamic';

// Minimal server component that delegates to client component
export default function Page(props: any) {
  return <VideoRoom {...props} />;
} 