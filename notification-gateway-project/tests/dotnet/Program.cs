using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

// This probe has no production credentials or network. Hash exactly as ForwardPushAsync does.
var input = JsonSerializer.Deserialize<Dictionary<string,string>>(Console.In.ReadToEnd())
    ?? throw new InvalidOperationException("Test vector required");
var body = Convert.FromBase64String(input["bodyBase64"]);
var digest = Convert.ToHexString(SHA256.HashData(body)).ToLowerInvariant();
var signature = Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(input["secret"]),
    Encoding.UTF8.GetBytes(input["timestamp"] + "\n" + input["nonce"] + "\n" + digest))).ToLowerInvariant();
Console.Write(JsonSerializer.Serialize(new {digest,signature}));
