import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dashboard")({
    component: DashboardLayout,
});

function DashboardLayout() {
    // const { user } = Route.useRouteContext();

    return (
        <>
            <Outlet />
            <nav>Side navbar</nav>
        </>
    );
}
