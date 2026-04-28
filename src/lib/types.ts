export default interface StandardResponse<T> {
    success: boolean;
    data: T | null;
    message: string | null;
    error: string | null;
}

export interface S3Credential {
    accessKeyId: string;
    secretAccessKey: string;
    endpointUrl?: string;
}
