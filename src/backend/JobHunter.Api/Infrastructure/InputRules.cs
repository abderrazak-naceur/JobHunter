namespace JobHunter.Api.Infrastructure;

/// <summary>Small validation rules shared by the endpoints.</summary>
public static class InputRules
{
    /// <summary>Only absolute http/https addresses: <c>javascript:</c>, <c>data:</c> and similar are refused.</summary>
    public static bool IsHttpUrl(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps) &&
        !string.IsNullOrEmpty(uri.Host);

    public static bool IsEmail(string value)
    {
        var at = value.IndexOf('@');
        return at > 0 && at == value.LastIndexOf('@') && at < value.Length - 3 &&
               value[(at + 1)..].Contains('.') && !value.Any(char.IsWhiteSpace) &&
               !value.StartsWith('.') && !value.EndsWith('.');
    }
}
