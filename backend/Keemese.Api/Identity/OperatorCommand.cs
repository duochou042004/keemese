namespace Keemese.Api.Identity;

public static class OperatorCommand
{
    public static async Task<int> RunAsync(string[] args, IdentityService service)
    {
        // Secrets never accepted as arguments or redirected input. Fail rather than echo a password.
        if (Console.IsInputRedirected || args.Length != 1 || args[0] is not ("identity-bootstrap" or "identity-recover"))
        {
            Console.Error.WriteLine("Use identity-bootstrap or identity-recover from an interactive terminal."); return 2;
        }
        try
        {
            if (args[0] == "identity-bootstrap")
            {
                Console.Write("Username: "); var username = Console.ReadLine() ?? "";
                var password = ReadSecret("Password: ");
                await service.BootstrapAsync(username, password);
            }
            else
            {
                Console.Write("Type RECOVER to revoke all tutor sessions and reset credentials: ");
                if (Console.ReadLine() != "RECOVER") throw new ApiFault(400, "recovery_confirmation_required");
                var password = ReadSecret("New password: ");
                await service.RecoverAsync(password, true);
            }
            Console.WriteLine("Completed."); return 0;
        }
        catch (ApiFault e) { Console.Error.WriteLine(e.Code); return 1; }
        catch (Exception) { Console.Error.WriteLine("Operation failed; inspect database availability without exposing credentials."); return 1; }
    }

    private static string ReadSecret(string prompt)
    {
        Console.Write(prompt); var chars = new List<char>();
        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter) break;
            if (key.Key == ConsoleKey.Backspace) { if (chars.Count > 0) chars.RemoveAt(chars.Count - 1); }
            else if (!char.IsControl(key.KeyChar) && chars.Count < 129) chars.Add(key.KeyChar);
        }
        Console.WriteLine(); return new string(chars.ToArray());
    }
}
