import { AnimatePresence, motion } from "framer-motion";
import { Button } from "./ui/button";

export const DeleteButton = ({
    onClick,
    deleteConfirmationId,
    idMatcher,
    btnContent = "Delete",
}: {
    onClick: () => void;
    deleteConfirmationId: string | null;
    idMatcher: string;
    btnContent?: string;
}) => {
    return (
        <Button
            variant="destructive"
            onClick={onClick}
            className="min-w-48 overflow-hidden"
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
                        ? "Click again to confirm"
                        : btnContent}
                </motion.span>
            </AnimatePresence>
        </Button>
    );
};
