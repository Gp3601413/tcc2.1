using System.Text;

namespace SmartFixApi.Services;

public sealed class JwtSettings
{
    public string Secret { get; init; } = string.Empty;
    public string Issuer { get; init; } = "SmartFixApi";
    public string Audience { get; init; } = "SmartFixFrontend";
    public int ExpiraEmDias { get; init; } = 1;

    public void Validar()
    {
        if (string.IsNullOrWhiteSpace(Secret) || Encoding.UTF8.GetByteCount(Secret) < 32 ||
            Secret.Contains("TROQUE", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Configure Jwt:Secret com uma chave aleatória de pelo menos 32 bytes em User Secrets ou variável de ambiente.");
        if (string.IsNullOrWhiteSpace(Issuer) || string.IsNullOrWhiteSpace(Audience) || ExpiraEmDias is < 1 or > 7)
            throw new InvalidOperationException("Configure Jwt:Issuer, Jwt:Audience e Jwt:ExpiraEmDias (1 a 7).");
    }
}
