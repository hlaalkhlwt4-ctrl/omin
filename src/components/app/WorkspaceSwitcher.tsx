'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type WorkspaceOption = { id: string; name: string };

export function WorkspaceSwitcher({
  activeWorkspaceId,
  workspaces,
}: {
  activeWorkspaceId: string;
  workspaces: WorkspaceOption[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  if (workspaces.length < 2) return null;

  return (
    <label className="inline-flex">
      <span className="sr-only">تبديل النشاط</span>
      <select
        aria-label="تبديل النشاط التجاري"
        value={activeWorkspaceId}
        disabled={loading}
        onChange={async (event) => {
          setLoading(true);
          const response = await fetch('/api/workspace/switch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ workspaceId: event.target.value }),
          });
          setLoading(false);
          if (response.ok) {
            router.push('/dashboard');
            router.refresh();
          }
        }}
        className="max-w-44 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
        ))}
      </select>
    </label>
  );
}
