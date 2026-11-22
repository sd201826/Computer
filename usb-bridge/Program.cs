using System.Buffers;
using System.Collections.Concurrent;
using System.ComponentModel;
using System.Globalization;
using System.Management;
using System.Net;
using System.Runtime.InteropServices;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Win32.SafeHandles;
using System.Security.Principal;

const string AllowedOrigin = "https://restore-lab.pages.dev";
const int Port = 17841;

if (!OperatingSystem.IsWindows())
{
    Console.Error.WriteLine("Restore Lab USB Bridge only runs on Windows.");
    return;
}

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.ConfigureKestrel(options => options.Listen(IPAddress.Loopback, Port));
builder.Services.AddCors(options =>
{
    options.AddPolicy("RestoreLabOnly", policy => policy
        .WithOrigins(AllowedOrigin)
        .AllowAnyMethod()
        .AllowAnyHeader()
        .WithExposedHeaders("Accept-Ranges", "Content-Length", "Content-Range"));
});

var app = builder.Build();
var sessions = new ConcurrentDictionary<Guid, UsbDiskSession>();

app.UseCors("RestoreLabOnly");
app.Use(async (context, next) =>
{
    if (context.Request.Path.StartsWithSegments("/api") &&
        !HttpMethods.IsOptions(context.Request.Method))
    {
        var origin = context.Request.Headers.Origin.ToString();
        if (!string.Equals(origin, AllowedOrigin, StringComparison.OrdinalIgnoreCase))
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            await context.Response.WriteAsync("Only the official Restore Lab website can use this bridge.");
            return;
        }
    }

    await next();
});

app.MapGet("/api/status", () =>
{
    using var identity = WindowsIdentity.GetCurrent();
    var isAdmin = new WindowsPrincipal(identity).IsInRole(WindowsBuiltInRole.Administrator);
    return Results.Json(new
    {
        ok = true,
        app = "Restore Lab USB Bridge",
        version = "1.0.0",
        administrator = isAdmin,
        readOnly = true
    });
});

app.MapGet("/api/disks", () => ListUsbDisksResult());
app.MapGet("/api/disks/{index:int}/open", (int index) => OpenDiskSession(index));

app.MapMethods("/api/sessions/{sessionId:guid}/image", new[] { "GET", "HEAD" },
    async (Guid sessionId, HttpContext context) =>
    {
        if (!sessions.TryGetValue(sessionId, out var session) ||
            session.Handle.IsClosed || session.Handle.IsInvalid)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.Headers["Accept-Ranges"] = "bytes";
        context.Response.Headers["Cache-Control"] = "no-store";
        context.Response.ContentType = "application/octet-stream";

        if (HttpMethods.IsHead(context.Request.Method))
        {
            context.Response.StatusCode = StatusCodes.Status200OK;
            context.Response.ContentLength = session.Disk.SizeBytes;
            return;
        }

        if (!UsbDiskCatalog.TryParseRange(
                context.Request.Headers["Range"].ToString(),
                session.Disk.SizeBytes,
                out var start,
                out var end))
        {
            context.Response.StatusCode = StatusCodes.Status416RangeNotSatisfiable;
            context.Response.Headers["Content-Range"] = $"bytes */{session.Disk.SizeBytes}";
            return;
        }

        var length = end - start + 1;
        context.Response.StatusCode = StatusCodes.Status206PartialContent;
        context.Response.ContentLength = length;
        context.Response.Headers["Content-Range"] = $"bytes {start}-{end}/{session.Disk.SizeBytes}";

        try
        {
            await RawDiskReader.CopyRangeAsync(
                session.Handle,
                start,
                length,
                context.Response.Body,
                context.RequestAborted);
        }
        catch (OperationCanceledException)
        {
            // The browser closed the request, so the read can stop safely.
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"USB read error for PhysicalDrive{session.Disk.Index}: {ex.Message}");
            if (!context.Response.HasStarted)
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            }
        }
    });

app.MapGet("/", () => Results.Content(
    "<!doctype html><meta charset=utf-8><title>Restore Lab USB Bridge</title><h2>Restore Lab USB Bridge is running</h2><p>Keep this window open and return to https://restore-lab.pages.dev/run.html.</p><p>This helper exposes connected USB disks in read-only mode.</p>",
    "text/html"));

Console.WriteLine();
Console.WriteLine("  RESTORE LAB USB BRIDGE");
Console.WriteLine("  ----------------------");
Console.WriteLine("  Local address: http://127.0.0.1:" + Port);
Console.WriteLine("  Website:       " + AllowedOrigin);
Console.WriteLine("  Mode:          READ ONLY — no disk write or format functions");
Console.WriteLine();
Console.WriteLine("  Keep this window open while Restore Lab uses your USB.");
Console.WriteLine("  Close this window to stop the bridge.");
Console.WriteLine();

try
{
    await app.RunAsync();
}
catch (Exception ex)
{
    Console.Error.WriteLine("The USB Bridge could not start: " + ex.Message);
    Console.Error.WriteLine("Close another copy of the bridge and try again.");
    Console.ReadKey();
}

IResult ListUsbDisksResult()
{
    try
    {
        var disks = UsbDiskCatalog.ListUsbDisks();
        return Results.Json(new
        {
            disks = disks.Select(d => new
            {
                index = d.Index,
                model = d.Model,
                sizeBytes = d.SizeBytes,
                size = UsbDiskCatalog.FormatSize(d.SizeBytes)
            })
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Could not list USB disks",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
}

IResult OpenDiskSession(int index)
{
    try
    {
        var disk = UsbDiskCatalog.FindUsbDisk(index);
        if (disk is null)
        {
            return Results.NotFound(new { error = "That USB disk is no longer available. Refresh the list." });
        }

        var handle = RawDiskReader.OpenReadOnly(disk.Index);
        if (handle.IsInvalid)
        {
            handle.Dispose();
            return Results.Problem(
                title: "Could not open the USB disk",
                detail: "Windows could not open this device for read-only access. Check that it is connected and run the helper as administrator.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var id = Guid.NewGuid();
        sessions[id] = new UsbDiskSession(id, disk, handle);
        return Results.Json(new
        {
            sessionId = id,
            index = disk.Index,
            model = disk.Model,
            sizeBytes = disk.SizeBytes,
            size = UsbDiskCatalog.FormatSize(disk.SizeBytes),
            readOnly = true
        });
    }
    catch (Win32Exception ex)
    {
        return Results.Problem(
            title: "Could not open the USB disk",
            detail: ex.Message,
            statusCode: StatusCodes.Status403Forbidden);
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Could not open the USB disk",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
}

sealed record UsbDisk(int Index, string Model, long SizeBytes);

sealed class UsbDiskSession(Guid id, UsbDisk disk, SafeFileHandle handle)
{
    public Guid Id { get; } = id;
    public UsbDisk Disk { get; } = disk;
    public SafeFileHandle Handle { get; } = handle;
}

static class UsbDiskCatalog
{
    public static List<UsbDisk> ListUsbDisks()
    {
        var result = new List<UsbDisk>();
        using var searcher = new ManagementObjectSearcher(
            "SELECT Index, Model, Size, InterfaceType, PNPDeviceID FROM Win32_DiskDrive");

        using var collection = searcher.Get();
        foreach (ManagementObject item in collection)
        {
            using (item)
            {
                var interfaceType = Convert.ToString(item["InterfaceType"], CultureInfo.InvariantCulture) ?? "";
                var pnpId = Convert.ToString(item["PNPDeviceID"], CultureInfo.InvariantCulture) ?? "";
                var isUsb = interfaceType.Equals("USB", StringComparison.OrdinalIgnoreCase) ||
                            pnpId.Contains("USB", StringComparison.OrdinalIgnoreCase);

                if (!isUsb)
                {
                    continue;
                }

                var indexValue = item["Index"];
                var sizeValue = item["Size"];
                if (indexValue is null || sizeValue is null ||
                    !int.TryParse(Convert.ToString(indexValue, CultureInfo.InvariantCulture), out var index) ||
                    !long.TryParse(Convert.ToString(sizeValue, CultureInfo.InvariantCulture), out var size) ||
                    index < 0 || size <= 0)
                {
                    continue;
                }

                var model = Convert.ToString(item["Model"], CultureInfo.InvariantCulture)?.Trim();
                if (string.IsNullOrWhiteSpace(model))
                {
                    model = "USB storage device";
                }

                result.Add(new UsbDisk(index, model, size));
            }
        }

        return result.OrderBy(d => d.Index).ToList();
    }

    public static UsbDisk? FindUsbDisk(int index) =>
        ListUsbDisks().FirstOrDefault(d => d.Index == index);

    public static string FormatSize(long bytes)
    {
        string[] units = ["B", "KB", "MB", "GB", "TB"];
        double value = bytes;
        var unit = 0;
        while (value >= 1024 && unit < units.Length - 1)
        {
            value /= 1024;
            unit++;
        }

        return value.ToString(value >= 100 ? "0" : "0.0", CultureInfo.InvariantCulture) + " " + units[unit];
    }

    public static bool TryParseRange(string header, long size, out long start, out long end)
    {
        start = 0;
        end = 0;

        if (string.IsNullOrWhiteSpace(header) ||
            !header.StartsWith("bytes=", StringComparison.OrdinalIgnoreCase) ||
            header.Contains(','))
        {
            return false;
        }

        var parts = header[6..].Split('-', 2);
        if (parts.Length != 2)
        {
            return false;
        }

        if (parts[0].Length == 0)
        {
            if (!long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out var suffix) || suffix <= 0)
            {
                return false;
            }

            start = Math.Max(0, size - suffix);
            end = size - 1;
            return size > 0;
        }

        if (!long.TryParse(parts[0], NumberStyles.None, CultureInfo.InvariantCulture, out start) ||
            start < 0 || start >= size)
        {
            return false;
        }

        if (parts[1].Length == 0)
        {
            end = size - 1;
            return true;
        }

        if (!long.TryParse(parts[1], NumberStyles.None, CultureInfo.InvariantCulture, out end) || end < start)
        {
            return false;
        }

        end = Math.Min(end, size - 1);
        return true;
    }
}

static class RawDiskReader
{
    private const uint GenericRead = 0x80000000;
    private const uint ShareRead = 0x00000001;
    private const uint ShareWrite = 0x00000002;
    private const uint OpenExisting = 3;
    private const uint FileFlagOverlapped = 0x40000000;
    private const uint FileFlagRandomAccess = 0x10000000;

    [DllImport("kernel32.dll", EntryPoint = "CreateFileW", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern SafeFileHandle CreateFile(
        string fileName,
        uint desiredAccess,
        uint shareMode,
        IntPtr securityAttributes,
        uint creationDisposition,
        uint flagsAndAttributes,
        IntPtr templateFile);

    public static SafeFileHandle OpenReadOnly(int diskIndex)
    {
        var path = $@"\\.\PhysicalDrive{diskIndex}";
        var handle = CreateFile(
            path,
            GenericRead,
            ShareRead | ShareWrite,
            IntPtr.Zero,
            OpenExisting,
            FileFlagOverlapped | FileFlagRandomAccess,
            IntPtr.Zero);

        if (handle.IsInvalid)
        {
            var error = Marshal.GetLastWin32Error();
            handle.Dispose();
            throw new Win32Exception(error, "Windows could not open the selected USB disk for read-only access.");
        }

        return handle;
    }

    public static async Task CopyRangeAsync(
        SafeFileHandle handle,
        long offset,
        long length,
        Stream destination,
        CancellationToken cancellationToken)
    {
        const int BufferSize = 1024 * 1024;
        var buffer = ArrayPool<byte>.Shared.Rent(BufferSize);

        try
        {
            var remaining = length;
            var position = offset;

            while (remaining > 0)
            {
                var requested = (int)Math.Min(BufferSize, remaining);
                var read = await RandomAccess.ReadAsync(
                    handle,
                    buffer.AsMemory(0, requested),
                    position,
                    cancellationToken);

                if (read <= 0)
                {
                    throw new IOException("The USB disk was disconnected or could not provide the requested bytes.");
                }

                await destination.WriteAsync(buffer.AsMemory(0, read), cancellationToken);
                position += read;
                remaining -= read;
            }
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }
}
