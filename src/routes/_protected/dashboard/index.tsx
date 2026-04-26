import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/dashboard/")({
    component: Component,
});

function Component() {
    return (
        <div>
            <h1>Dashboard page!!</h1>
        </div>
    );
}
