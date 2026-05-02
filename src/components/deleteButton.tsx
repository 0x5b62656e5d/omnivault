import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";

export const DeleteButton = ({
    onClick,
    deleteConfirmationId,
    idMatcher,
    disabled,
    btnContent = "Delete",
}: {
    onClick: () => void;
    deleteConfirmationId: string | null;
    idMatcher: string;
    disabled: boolean;
    btnContent?: string;
}) => {
    return (
        <Button
            variant="destructive"
            onClick={onClick}
            className={`min-w-32 overflow-hidden ${disabled ? "cursor-not-allowed opacity-70 pointer-events-none" : ""}`}
            disabled={disabled}
        >
            <AnimatePresence mode="wait" initial={false}>
                <motion.span
                    key={
                        deleteConfirmationId === idMatcher
                            ? "confirm"
                            : "delete"
                    }
                    initial={{ rotateX: -90, opacity: 0 }}
                    animate={{ rotateX: 0, opacity: 1 }}
                    exit={{ rotateX: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                >
                    {deleteConfirmationId === idMatcher
                        ? "Are you sure?"
                        : btnContent}
                </motion.span>
            </AnimatePresence>
        </Button>
    );
};
