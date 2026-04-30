import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="flex min-w-full min-h-full p-4">
            <div className="flex w-full justify-center items-center">
                <p className="text-2xl font-medium">No provider selected.</p>
            </div>
        </div>
    );
}
