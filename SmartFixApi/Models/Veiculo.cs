namespace SmartFixApi.Models;

public class Veiculo
{
    public Guid Id { get; set; }
    public Guid UsuarioId { get; set; }
    public string? Cep { get; set; }
    public string? Cidade { get; set; }
    public string? Estado { get; set; }
    public string? Endereco { get; set; }
    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string? Ano { get; set; }
    public string? Placa { get; set; }
    public string? Cor { get; set; }
    public decimal BateriaInicial { get; set; } = 100;
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public Usuario? Usuario { get; set; }
    public ICollection<Telemetria> Telemetrias { get; set; } = new List<Telemetria>();
}
