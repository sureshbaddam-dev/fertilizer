import { Outlet } from 'react-router-dom';

export default function RootLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Shell Layout Container - Ready for UI Screens */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
