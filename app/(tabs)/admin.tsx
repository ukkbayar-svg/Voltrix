import { Redirect } from 'expo-router';
import { useAuth } from '@fastshot/auth';

export default function AdminTabRedirect() {
  const { user } = useAuth();

  // Hard-coded security override: only this email may access admin
  const isAdmin = user?.email === 'ukbayar@gmail.com';

  if (!isAdmin) {
    // Non-admins are immediately sent back to Command
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/admin" />;
}
