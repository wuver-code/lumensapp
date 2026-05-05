import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/new-chat")({
  component: () => <Navigate to="/find" />,
});
