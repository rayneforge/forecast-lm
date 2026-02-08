namespace Rayneforge.Forecast.Infrastructure.Conversation;

using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Rayneforge.Forecast.Domain.Models;
using Rayneforge.Forecast.Infrastructure.Abstractions;

/// <summary>
/// Azure Blob Storage implementation of <see cref="IChatBlobProvider"/>.
/// Works identically against Azurite (local emulator) and Azure Storage (cloud)
/// since they share the same SDK surface. The connection string drives the target.
/// </summary>
public sealed class AzureBlobChatBlobProvider : IChatBlobProvider
{
    private const string ContainerName = "chat-attachments";
    private readonly BlobContainerClient _container;

    public AzureBlobChatBlobProvider(BlobServiceClient blobService)
    {
        _container = blobService.GetBlobContainerClient(ContainerName);
    }

    public async Task<BlobRef> PutAsync(
        string path, string contentType, Stream data, CancellationToken ct = default)
    {
        await _container.CreateIfNotExistsAsync(cancellationToken: ct);

        var blob = _container.GetBlobClient(path);
        var response = await blob.UploadAsync(data, new BlobHttpHeaders { ContentType = contentType }, cancellationToken: ct);

        return new BlobRef(
            Provider: "azureblob",
            Uri: blob.Uri.ToString(),
            ETag: response.Value.ETag.ToString(),
            Checksum: null);
    }

    public async Task<Stream> GetAsync(BlobRef reference, CancellationToken ct = default)
    {
        var blob = _container.GetBlobClient(new Uri(reference.Uri).AbsolutePath.TrimStart('/'));
        var response = await blob.DownloadStreamingAsync(cancellationToken: ct);
        return response.Value.Content;
    }
}
