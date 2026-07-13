import type { Passkey } from "@better-auth/passkey";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { BsPencil } from "react-icons/bs";
import { FaDiscord, FaGithub, FaKey, FaRegTrashAlt } from "react-icons/fa";
import { FaCheck, FaXmark } from "react-icons/fa6";
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
    const [passkeys, setPasskeys] = useState<Passkey[]>([]);
    const [editingPasskeyId, setEditingPasskeyId] = useState<string | null>(
        null,
    );
    const [editingPasskeyName, setEditingPasskeyName] = useState("");
    const [isSavingPasskey, setIsSavingPasskey] = useState(false);

    const loadProviders = useCallback(async () => {
        setIsLoading(true);
        const accountList = await authClient.listAccounts();
        const { data: passkeys, error } =
            await authClient.passkey.listUserPasskeys();

        if (error === null) {
            setPasskeys(passkeys ?? []);
        } else {
            console.error("Error fetching passkeys:", error.status);
        }

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

    const addPasskey = async () => {
        await authClient.passkey.addPasskey({
            name: `key-${new Date().toISOString()}`,
            authenticatorAttachment: "cross-platform",
        });

        await loadProviders();
    };

    const editPasskey = async (id: string, name: string) => {
        await authClient.passkey.updatePasskey({
            id,
            name,
        });

        await loadProviders();
    };

    const startEditPasskey = (passkey: Passkey) => {
        setEditingPasskeyId(passkey.id);
        setEditingPasskeyName(passkey.name ?? "");
    };

    const cancelEditPasskey = () => {
        setEditingPasskeyId(null);
        setEditingPasskeyName("");
    };

    const saveEditPasskey = async () => {
        if (!editingPasskeyId) {
            return;
        }

        const trimmedName = editingPasskeyName.trim();
        if (trimmedName.length === 0) {
            return;
        }

        setIsSavingPasskey(true);
        await editPasskey(editingPasskeyId, trimmedName);
        cancelEditPasskey();
        setIsSavingPasskey(false);
    };

    const deletePasskey = async (id: string) => {
        await authClient.passkey.deletePasskey({
            id: id,
        });

        await loadProviders();
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
                        <div className="my-4 flex w-full flex-col items-center gap-4 p-6">
                            <h2 className="text-xl font-semibold mb-4">
                                Passkeys
                            </h2>
                            {passkeys.length === 0 ? (
                                <p>No passkeys registered.</p>
                            ) : (
                                <ul className="w-full list-disc pl-6">
                                    {passkeys.map(passkey => (
                                        <li
                                            className="flex w-full items-center justify-between gap-2 text-lg"
                                            key={passkey.id}
                                        >
                                            <div className="min-w-0 flex-1">
                                                {editingPasskeyId ===
                                                passkey.id ? (
                                                    <input
                                                        value={
                                                            editingPasskeyName
                                                        }
                                                        onChange={event =>
                                                            setEditingPasskeyName(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        onKeyDown={async event => {
                                                            if (
                                                                event.key ===
                                                                "Enter"
                                                            ) {
                                                                await saveEditPasskey();
                                                            }
                                                            if (
                                                                event.key ===
                                                                "Escape"
                                                            ) {
                                                                cancelEditPasskey();
                                                            }
                                                        }}
                                                        className="w-full rounded border px-2 py-1 text-base"
                                                        autoFocus
                                                    />
                                                ) : (
                                                    passkey.name
                                                )}
                                            </div>
                                            <span className="flex justify-evenly items-center gap-1">
                                                {editingPasskeyId ===
                                                passkey.id ? (
                                                    <>
                                                        <button
                                                            className="disabled:cursor-not-allowed disabled:opacity-70"
                                                            onClick={
                                                                saveEditPasskey
                                                            }
                                                            type="button"
                                                            disabled={
                                                                isSavingPasskey ||
                                                                editingPasskeyName.trim()
                                                                    .length ===
                                                                    0
                                                            }
                                                        >
                                                            <FaCheck
                                                                size={24}
                                                            />
                                                        </button>
                                                        <button
                                                            className="disabled:cursor-not-allowed disabled:opacity-70"
                                                            onClick={
                                                                cancelEditPasskey
                                                            }
                                                            type="button"
                                                            disabled={
                                                                isSavingPasskey
                                                            }
                                                        >
                                                            <FaXmark
                                                                size={24}
                                                            />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() =>
                                                                startEditPasskey(
                                                                    passkey,
                                                                )
                                                            }
                                                            type="button"
                                                        >
                                                            <BsPencil
                                                                size={24}
                                                            />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                deletePasskey(
                                                                    passkey.id,
                                                                )
                                                            }
                                                            type="button"
                                                        >
                                                            <FaRegTrashAlt
                                                                size={24}
                                                            />
                                                        </button>
                                                    </>
                                                )}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            <Button
                                onClick={addPasskey}
                                type="button"
                                disabled={linkingOperation}
                                className={`w-fit ${
                                    linkingOperation
                                        ? "cursor-not-allowed opacity-70 pointer-events-none"
                                        : ""
                                }`}
                            >
                                <FaKey /> Add passkey
                            </Button>
                        </div>
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
