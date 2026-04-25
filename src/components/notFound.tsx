export const NotFound = (): React.ReactNode => {
    return (
        <div className="w-full h-full flex flex-col justify-center items-center">
            <h1>
                The page you have requested does not exist or has been moved.
            </h1>
            <button onClick={() => window.history.back()} type="button">
                Go Back
            </button>
        </div>
    );
};
