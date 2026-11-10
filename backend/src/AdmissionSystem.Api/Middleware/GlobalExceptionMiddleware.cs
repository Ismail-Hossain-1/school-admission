using System.Text.Json;
using AdmissionSystem.Api.Exceptions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace AdmissionSystem.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = MapException(exception);

        if (statusCode >= 500)
        {
            _logger.LogError(exception, "Unhandled server exception processing {Method} {Path}",
                context.Request.Method, context.Request.Path);
        }
        else
        {
            _logger.LogWarning("Request rejected with {StatusCode}: {Message} ({Method} {Path})",
                statusCode, message, context.Request.Method, context.Request.Path);
        }

        if (context.Response.HasStarted)
        {
            return;
        }

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var payload = JsonSerializer.Serialize(new { error = message });
        await context.Response.WriteAsync(payload);
    }

    private static (int StatusCode, string Message) MapException(Exception exception)
    {
        return exception switch
        {
            SeatUnavailableException ex => (StatusCodes.Status409Conflict, ex.Message),
            ResourceNotFoundException ex => (StatusCodes.Status404NotFound, ex.Message),
            UnauthorizedHoldAccessException ex => (StatusCodes.Status403Forbidden, ex.Message),
            ActiveApplicationExistsException ex => (StatusCodes.Status400BadRequest, ex.Message),
            HoldExpiredException ex => (StatusCodes.Status400BadRequest, ex.Message),
            InvalidHoldOperationException ex => (StatusCodes.Status400BadRequest, ex.Message),
            BadHttpRequestException ex => (StatusCodes.Status400BadRequest, $"Invalid request: {ex.Message}"),
            JsonException => (StatusCodes.Status400BadRequest, "Malformed JSON request payload."),
            ArgumentException ex => (StatusCodes.Status400BadRequest, ex.Message),
            DbUpdateException dbEx when dbEx.InnerException is PostgresException pgEx => MapPostgresException(pgEx),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected internal error occurred.")
        };
    }

    private static (int StatusCode, string Message) MapPostgresException(PostgresException pgEx)
    {
        return pgEx.SqlState switch
        {
            PostgresErrorCodes.UniqueViolation => (StatusCodes.Status409Conflict, "Conflicting record already exists."),
            PostgresErrorCodes.CheckViolation => (StatusCodes.Status400BadRequest, "Input violates domain constraints."),
            PostgresErrorCodes.ForeignKeyViolation => (StatusCodes.Status400BadRequest, "Referenced resource does not exist."),
            PostgresErrorCodes.StringDataRightTruncation => (StatusCodes.Status400BadRequest, "Input exceeds maximum allowed length."),
            PostgresErrorCodes.InvalidTextRepresentation => (StatusCodes.Status400BadRequest, "Invalid input format."),
            _ => (StatusCodes.Status500InternalServerError, "A database error occurred while processing your request.")
        };
    }
}

