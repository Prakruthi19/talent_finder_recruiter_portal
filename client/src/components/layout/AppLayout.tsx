import { Outlet } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <Header />
      <Sidebar />
      <main className="pt-16 sm:pl-56">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
