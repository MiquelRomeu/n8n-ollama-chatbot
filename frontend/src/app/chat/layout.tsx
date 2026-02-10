import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  if (!session) {
    redirect('/login');
  }

  return <div className="h-screen">{children}</div>;
}
