namespace SmartFixApi.Models;

public class Usuario
{
    public Guid Id { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Telefone { get; set; }
    public string SenhaHash { get; set; } = string.Empty;
    public string Papel { get; set; } = "cliente";
    public bool IsAdmin { get; set; }
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public ICollection<Veiculo> Veiculos { get; set; } = new List<Veiculo>();
    public Mecanica? Mecanica { get; set; }
}
