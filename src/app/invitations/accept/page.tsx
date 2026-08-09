import { AcceptInvitationClient } from './AcceptInvitationClient';

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950"><AcceptInvitationClient token={token} /></main>;
}
