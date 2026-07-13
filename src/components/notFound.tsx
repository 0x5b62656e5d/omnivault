export const NotFound = (): React.ReactNode => {
    return (
        <div className="w-full h-full flex flex-col justify-center items-center gap-2">
            <h1>
                The page you have requested does not exist or has been moved.
            </h1>
            <button
                className="border-2 px-2 py-1 rounded hover:cursor-pointer"
                onClick={() => window.history.back()}
                type="button"
            >
                Go Back
            </button>
        </div>
    );
};
