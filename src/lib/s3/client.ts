import { S3Client } from "@aws-sdk/client-s3";
import type { S3Credential } from "../types";

export const createClient = (region: string, s3Credential: S3Credential) => {
    return s3Credential.endpointUrl
        ? new S3Client({
              region: region,
              endpoint: s3Credential.endpointUrl,
              credentials: {
                  accessKeyId: s3Credential.accessKeyId,
                  secretAccessKey: s3Credential.secretAccessKey,
              },
              forcePathStyle: true,
          })
        : new S3Client({
              region: region,
              credentials: {
                  accessKeyId: s3Credential.accessKeyId,
                  secretAccessKey: s3Credential.secretAccessKey,
              },
              forcePathStyle: true,
          });
};
