import { useForm } from "@tanstack/react-form";
import { createFileRoute } from "@tanstack/react-router";
import { FaDiscord, FaGithub } from "react-icons/fa";
import { FieldInfo } from "@/components/fieldInfo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/signin/")({
    component: RouteComponent,
});

function RouteComponent() {
    const form = useForm({
        defaultValues: {
            email: "",
            password: "",
        },
        onSubmit: async ({ value }) => {
            await authClient.signIn.email({
                email: value.email,
                password: value.password,
            });
        },
    });

    const signinWithGithub = async (
        _event: React.MouseEvent<HTMLButtonElement>,
    ) => {
        console.log("signing in with github");

        await authClient.signIn.social({
            provider: "github",
            callbackURL: "/dashboard",
        });
    };

    const signinWithDiscord = async (
        _event: React.MouseEvent<HTMLButtonElement>,
    ) => {
        console.log("signing in with discord");

        await authClient.signIn.social({
            provider: "discord",
            callbackURL: "/dashboard",
        });
    };

    return (
        <div className="flex flex-col justify-center items-center m-4 p-4 gap-4">
            <p>You must sign in.</p>
            <form
                onSubmit={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
            >
                <form.Field
                    name="email"
                    validators={{
                        onChange: ({ value }) =>
                            !value
                                ? "An email is required"
                                : value.length < 3
                                  ? "Email must be at least 3 characters"
                                  : undefined,
                        onChangeAsyncDebounceMs: 500,
                        onChangeAsync: async ({ value }) => {
                            await new Promise(resolve =>
                                setTimeout(resolve, 1000),
                            );
                            return (
                                value.includes("error") &&
                                'No "error" allowed in email'
                            );
                        },
                    }}
                    children={field => {
                        return (
                            <>
                                <label htmlFor={field.name}>Email:</label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={e =>
                                        field.handleChange(e.target.value)
                                    }
                                    // className="border border-gray-300 rounded p-1 m-1"
                                />
                                <FieldInfo field={field} />
                            </>
                        );
                    }}
                />
                <form.Field
                    name="password"
                    validators={{
                        onChange: ({ value }) =>
                            !value
                                ? "An password is required"
                                : value.length < 3
                                  ? "Password must be at least 3 characters"
                                  : undefined,
                        onChangeAsyncDebounceMs: 500,
                        onChangeAsync: async ({ value }) => {
                            await new Promise(resolve =>
                                setTimeout(resolve, 1000),
                            );
                            return (
                                value.includes("error") &&
                                'No "error" allowed in password'
                            );
                        },
                    }}
                    children={field => {
                        return (
                            <>
                                <label htmlFor={field.name}>Password:</label>
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={e =>
                                        field.handleChange(e.target.value)
                                    }
                                    // className="border border-gray-300 rounded p-1 m-1"
                                    type="password"
                                />
                                <FieldInfo field={field} />
                            </>
                        );
                    }}
                />
                <Button type="submit">Sign In</Button>
            </form>
            <br />
            <Button onClick={signinWithGithub} type="button">
                <FaGithub /> Sign in with Github
            </Button>
            <Button onClick={signinWithDiscord} type="button">
                <FaDiscord /> Sign in with Discord
            </Button>
        </div>
    );
}
