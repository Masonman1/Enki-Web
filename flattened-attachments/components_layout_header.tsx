// components/layout/header.tsx: Stub for Enki header (Phase 1 dashboard nav)
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="p-4 border-b">
      <h1 className="text-xl font-bold">Enki PM Dashboard</h1>
      <Button variant="outline">Logout</Button>
    </header>
  );
}