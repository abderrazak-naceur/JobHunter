namespace JobHunter.Api.Contracts;

public sealed record LoginRequest(string? Username, string? Password);

public sealed record LoginResponse(string AccessToken, DateTimeOffset ExpiresAt);

public sealed record ChangePasswordRequest(string? CurrentPassword, string? NewPassword);

public sealed record CurrentUserResponse(string Username);
