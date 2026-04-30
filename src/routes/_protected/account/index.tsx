import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { FaDiscord, FaGithub } from "react-icons/fa";
import { SiRailway } from "react-icons/si";
import { DeleteButton } from "@/components/deleteButton";
import { Loader } from "@/components/loader";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_protected/account/")({
    component: DashboardLayout,
});

function DashboardLayout() {
    const [providerList, setProviderList] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [deleteConfirmation, setDeleteConfirmation] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [linkingOperation, setLinkingOperation] = useState(false);

    const loadProviders = useCallback(async () => {
        setIsLoading(true);
        const accountList = await authClient.listAccounts();

        setProviderList(
            accountList.data?.map(account =>
                account.providerId.toLowerCase(),
            ) ?? [],
        );
        setIsLoading(false);
    }, []);

    useEffect(() => {
        loadProviders();
    }, [loadProviders]);

    const linkGithub = async (link: boolean) => {
        setLinkingOperation(true);

        if (link) {
            await authClient.linkSocial({
                provider: "github",
                callbackURL: "/account",
            });
        } else {
            await authClient.unlinkAccount({
                providerId: "github",
            });
        }

        await loadProviders();

        setLinkingOperation(false);
    };

    const linkDiscord = async (link: boolean) => {
        setLinkingOperation(true);

        if (link) {
            await authClient.linkSocial({
                provider: "discord",
                callbackURL: "/account",
            });
        } else {
            await authClient.unlinkAccount({
                providerId: "discord",
            });
        }

        await loadProviders();
        setLinkingOperation(false);
    };

    const linkRailway = async (link: boolean) => {
        setLinkingOperation(true);

        if (link) {
            await authClient.linkSocial({
                provider: "railway",
                callbackURL: "/account",
            });
        } else {
            await authClient.unlinkAccount({
                providerId: "railway",
            });
        }

        await loadProviders();
        setLinkingOperation(false);
    };

    const deleteAccount = async () => {
        if (!deleteConfirmation) {
            setDeleteConfirmation(true);

            setTimeout(() => {
                setDeleteConfirmation(false);
            }, 3000);

            return;
        }

        setIsDeleting(true);

        await authClient.deleteUser({
            callbackURL: "/signin",
        });

        setIsDeleting(false);
    };

    return (
        <div className="flex flex-col gap-6">
            <h1 className="text-2xl font-medium self-center">
                Manage linked accounts
            </h1>
            <div className="m-4 flex flex-col justify-center items-center gap-4">
                {isLoading ? (
                    <Loader />
                ) : (
                    <>
                        <Button
                            onClick={() =>
                                linkGithub(!providerList.includes("github"))
                            }
                            type="button"
                            disabled={linkingOperation}
                            className={
                                linkingOperation
                                    ? "cursor-not-allowed opacity-70 pointer-events-none"
                                    : ""
                            }
                        >
                            <FaGithub />{" "}
                            {providerList.includes("github")
                                ? "Unlink"
                                : "Link"}{" "}
                            Github account
                        </Button>
                        <Button
                            onClick={() =>
                                linkDiscord(!providerList.includes("discord"))
                            }
                            type="button"
                            disabled={linkingOperation}
                            className={
                                linkingOperation
                                    ? "cursor-not-allowed opacity-70 pointer-events-none"
                                    : ""
                            }
                        >
                            <FaDiscord />{" "}
                            {providerList.includes("discord")
                                ? "Unlink"
                                : "Link"}{" "}
                            Discord account
                        </Button>
                        <Button
                            onClick={() =>
                                linkRailway(!providerList.includes("railway"))
                            }
                            type="button"
                            disabled={linkingOperation}
                            className={
                                linkingOperation
                                    ? "cursor-not-allowed opacity-70 pointer-events-none"
                                    : ""
                            }
                        >
                            <SiRailway />{" "}
                            {providerList.includes("railway")
                                ? "Unlink"
                                : "Link"}{" "}
                            Railway account
                        </Button>
                        <DeleteButton
                            onClick={deleteAccount}
                            deleteConfirmationId={
                                deleteConfirmation ? "account" : null
                            }
                            idMatcher={"account"}
                            disabled={isDeleting}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
