import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.functions";

export const Route = createFileRoute("/_protected")({
    beforeLoad: async ({ location }) => {
        const start = performance.now();
        const session = await getSession();
        console.log("protectedsession", performance.now() - start);

        if (!session) {
            throw redirect({
                to: "/signin",
                search: { redirect: location.href },
            });
        }

        return { user: session.user };
    },
    component: Component,
});

function Component() {
    return (
        <div className="relative flex flex-col lg:flex-row w-full min-h-full p-4">
            <div className="w-full pt-4">
                <Outlet />
            </div>
        </div>
    );
}
