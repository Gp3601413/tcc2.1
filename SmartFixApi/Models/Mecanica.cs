namespace SmartFixApi.Models;

public class Mecanica
{
    public Guid Id { get; set; }
    public Guid? UsuarioId { get; set; }
    public string? Cnpj { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Especializacao { get; set; }
    public string? Endereco { get; set; }
    public string? Telefone { get; set; }
    public decimal? Latitude { get; set; }
    public decimal? Longitude { get; set; }
    public decimal Avaliacao { get; set; } = 5.0m;
    public string StatusAprovacao { get; set; } = "pendente";
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public Usuario? Usuario { get; set; }
    public ICollection<ServicoMecanica> Servicos { get; set; } = new List<ServicoMecanica>();
    public ICollection<HorarioMecanica> Horarios { get; set; } = new List<HorarioMecanica>();
}
