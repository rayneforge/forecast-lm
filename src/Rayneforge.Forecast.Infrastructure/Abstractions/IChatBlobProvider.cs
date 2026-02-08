namespace Rayneforge.Forecast.Infrastructure.Abstractions;

using Rayneforge.Forecast.Domain.Models;

/// <summary>
/// Binary payload storage for chat attachments and media.
/// Single implementation covers both Azurite (local) and Azure Storage (cloud)
/// since they share the same SDK surface.
/// </summary>
public interface IChatBlobProvider
{
    Task<BlobRef> PutAsync(
        string path,
        string contentType,
        Stream data,
        CancellationToken ct = default);

    Task<Stream> GetAsync(
        BlobRef reference,
        CancellationToken ct = default);
}
