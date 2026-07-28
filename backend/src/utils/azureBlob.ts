import { BlobSASPermissions, BlobServiceClient } from "@azure/storage-blob";
import { env } from "../config/env";

const blobServiceClient = BlobServiceClient.fromConnectionString(env.AZURE_STORAGE_CONNECTION_STRING);

export async function uploadBuffer(params: {
  containerName: string;
  blobPath: string;
  buffer: Buffer;
  contentType: string;
}) {
  const containerClient = blobServiceClient.getContainerClient(params.containerName);
  await containerClient.createIfNotExists();
  const blockBlobClient = containerClient.getBlockBlobClient(params.blobPath);
  await blockBlobClient.uploadData(params.buffer, {
    blobHTTPHeaders: { blobContentType: params.contentType },
  });
}

export function getReadSasUrl(params: { containerName: string; blobPath: string; expiryMinutes: number }) {
  const containerClient = blobServiceClient.getContainerClient(params.containerName);
  const blockBlobClient = containerClient.getBlockBlobClient(params.blobPath);
  const expiresOn = new Date(Date.now() + params.expiryMinutes * 60 * 1000);
  return blockBlobClient.generateSasUrl({
    permissions: BlobSASPermissions.parse("r"),
    expiresOn,
  });
}

export async function deleteBlob(params: { containerName: string; blobPath: string }) {
  const containerClient = blobServiceClient.getContainerClient(params.containerName);
  await containerClient.getBlockBlobClient(params.blobPath).deleteIfExists();
}
