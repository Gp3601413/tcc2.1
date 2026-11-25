using System.ComponentModel.DataAnnotations;

namespace SmartFixApi.DTOs;

public class SimularTelemetriaRequest
{
    [Required] public Guid VeiculoId { get; set; }
    [Range(typeof(decimal), "0", "100")] public decimal Bateria { get; set; }
    [Range(typeof(decimal), "-100", "200")] public decimal Temperatura { get; set; }
    [Range(typeof(decimal), "0", "500")] public decimal Velocidade { get; set; }
}
