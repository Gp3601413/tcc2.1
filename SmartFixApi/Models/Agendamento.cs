namespace SmartFixApi.Models;

public class Agendamento
{
    public Guid Id { get; set; }
    public Guid UsuarioId { get; set; }
    public Guid MecanicaId { get; set; }
    public string Servico { get; set; } = string.Empty;
    public DateTime DataHora { get; set; }
    public string? Observacoes { get; set; }
    public string Status { get; set; } = "Pendente";
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;

    public Usuario? Usuario { get; set; }
    public Mecanica? Mecanica { get; set; }
}
