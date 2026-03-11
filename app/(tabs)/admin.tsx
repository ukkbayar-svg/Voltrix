import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function AdminTabRedirect() {
  const { user } = useAuth();

  // Hard-coded security override: only this exact account may access admin
  const isAdmin = user?.email === 'ukbayar@gmail.com' && user?.id === '40e32eee-1bee-4033-9ce1-f3b29d112d6e';

  if (!isAdmin) {
    // Non-admins are immediately sent back to Command
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/admin" />;
}