namespace SmartFixApi.Models;

public class ServicoMecanica
{
    public Guid Id { get; set; }
    public Guid MecanicaId { get; set; }
    public string Nome { get; set; } = string.Empty;
    public string? Descricao { get; set; }
    public decimal? PrecoEstimado { get; set; }
    public Mecanica? Mecanica { get; set; }
}
