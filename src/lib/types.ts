export default interface StandardResponse<T> {
    success: boolean;
    data: T | null;
    message: string | null;
    error: string | null;
}
