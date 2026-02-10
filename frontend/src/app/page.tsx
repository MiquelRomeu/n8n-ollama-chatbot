import { redirect } from 'next/navigation';
import { requireAuth } from '@/lib/auth';

export default async function Home() {
  const session = await requireAuth();
  if (session) {
    redirect('/chat');
  } else {
    redirect('/login');
  }
}
