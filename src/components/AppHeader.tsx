import { Link } from "@tanstack/react-router";
import { Bell, Settings as SettingsIcon } from "lucide-react";
import { type ReactNode } from "react";
import logo from "@/assets/seyo-logo.png";

type Props = {
  title?: string;
  rightActions?: ReactNode;
  subRow?: ReactNode;
  showLogo?: boolean;
};

/**
 * Frosted glassmorphic header used across every page of the app.
 * - Sticky at the top
 * - seyo! logo on the left
 * - Title in the middle (optional)
 * - Bell + Settings on the right (plus any extra actions)
 * - Optional `subRow` rendered as a row below the bar (used by Chat)
 */
export function AppHeader({ title, rightActions, subRow, showLogo = true }: Props) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-white/10">
      <div className="mx-auto max-w-md px-4 py-3 flex items-center gap-3">
        {showLogo && <img src={logo} alt="seyo!" className="h-8 w-auto" />}
        {title && (
          <h1 className="font-bold text-lg truncate flex-1">{title}</h1>
        )}
        {!title && <div className="flex-1" />}
        <div className="flex items-center gap-2">
          {rightActions}
          <button
            className="glass h-10 w-10 rounded-full flex items-center justify-center relative"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-rose-500" />
          </button>
          <Link
            to="/settings"
            className="glass h-10 w-10 rounded-full flex items-center justify-center"
            aria-label="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {subRow && (
        <div className="mx-auto max-w-md flex justify-end items-center gap-3 px-4 pb-2">
          {subRow}
        </div>
      )}
    </div>
  );
}
