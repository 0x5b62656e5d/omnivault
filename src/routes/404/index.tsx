import { createFileRoute } from "@tanstack/react-router";
import { NotFound } from "@/components/notFound";

export const Route = createFileRoute("/404/")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="w-full flex-1 flex justify-center items-center">
            <NotFound />
        </div>
    );
}
