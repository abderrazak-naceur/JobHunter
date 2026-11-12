using System.Text;

namespace JobHunter.Api.Infrastructure.Auth;

/// <summary>
/// CLI helper: <c>dotnet run --project src/backend/JobHunter.Api -- hash-password</c>.
/// Prompts for a password (hidden when interactive) and prints the hash to store in <c>Admin:PasswordHash</c>.
/// </summary>
public static class PasswordHashCommand
{
    public const string Name = "hash-password";

    public static int Run()
    {
        var password = ReadPassword("Password: ");
        if (password.Length < 12)
        {
            Console.Error.WriteLine("Use at least 12 characters.");
            return 1;
        }

        if (!Console.IsInputRedirected)
        {
            var confirmation = ReadPassword("Repeat password: ");
            if (!string.Equals(password, confirmation, StringComparison.Ordinal))
            {
                Console.Error.WriteLine("The passwords do not match.");
                return 1;
            }
        }

        Console.WriteLine(PasswordHasher.Hash(password));
        return 0;
    }

    private static string ReadPassword(string prompt)
    {
        if (Console.IsInputRedirected) return Console.ReadLine() ?? "";

        Console.Error.Write(prompt);
        var buffer = new StringBuilder();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter) break;
            if (key.Key == ConsoleKey.Backspace)
            {
                if (buffer.Length > 0) buffer.Length--;
            }
            else if (!char.IsControl(key.KeyChar))
            {
                buffer.Append(key.KeyChar);
            }
        }
        Console.Error.WriteLine();
        return buffer.ToString();
    }
}
