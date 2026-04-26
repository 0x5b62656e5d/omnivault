import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_protected/account")({
    component: RouteComponent,
});

function RouteComponent() {
    const navigate = useNavigate();

    return (
        <>
            <nav className="flex flex-col justify-center items-center gap-2 max-w-40 m-4">
                <Button
                    className="w-full"
                    onClick={() => navigate({ to: "/account" })}
                >
                    Manage account
                </Button>
                <Button
                    className="w-full"
                    onClick={() => navigate({ to: "/account/manage-s3" })}
                >
                    Manage S3 accounts
                </Button>
            </nav>
            <Outlet />
        </>
    );
}
