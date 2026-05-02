import { createFileRoute } from "@tanstack/react-router";
import { FiArrowUpRight } from "react-icons/fi";

export const Route = createFileRoute("/about/")({
    head: () => ({
        links: [
            {
                rel: "canonical",
                href: "https://omnivault.benkou.dev/about",
            },
        ],
    }),
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <div className="flex w-full min-h-full p-4">
            <div className="flex flex-col w-full items-center gap-4">
                <h1 className="text-4xl font-medium">About Omnivault</h1>
                <p className="text-center">
                    This project allows users to manage S3-compatible storage
                    services from different providers in a unified dashboard.
                </p>
                <p className="text-center">
                    Read more about the project{" "}
                    <a
                        href="https://benkou.dev/thoughts/omnivault"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex justify-center items-center transition-transform duration-250 ease-in-out hover:scale-[1.025]"
                    >
                        <u>here</u>
                        <FiArrowUpRight />
                    </a>
                    .
                </p>
                <a
                    href="https://github.com/0x5b62656e5d/omnivault"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex justify-center items-center transition-transform duration-250 ease-in-out hover:scale-[1.025]"
                >
                    <u>GitHub Repository</u>
                    <FiArrowUpRight />
                </a>
            </div>
        </div>
    );
}
