import type { Metadata } from 'next';
import { PublicProfile } from '../../../components/public-profile';

export const metadata: Metadata = {
  title: 'Community profile — INSTEAD',
  robots: { index: false, follow: false },
};

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <PublicProfile username={username} />;
}
