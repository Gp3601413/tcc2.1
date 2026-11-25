namespace SmartFixApi.Models;

public class HorarioMecanica
{
    public Guid Id { get; set; }
    public Guid MecanicaId { get; set; }
    public int DiaSemana { get; set; }
    public TimeOnly? Abertura { get; set; }
    public TimeOnly? Fechamento { get; set; }
    public bool Fechado { get; set; }
    public Mecanica? Mecanica { get; set; }
}
