import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/account/")({
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
