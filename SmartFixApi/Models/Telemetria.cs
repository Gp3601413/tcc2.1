namespace SmartFixApi.Models;

public class Telemetria
{
    public Guid Id { get; set; }
    public Guid VeiculoId { get; set; }
    public decimal Bateria { get; set; }
    public decimal Temperatura { get; set; }
    public decimal Velocidade { get; set; }
    public DateTime RegistradoEm { get; set; } = DateTime.UtcNow;

    public Veiculo? Veiculo { get; set; }
}
