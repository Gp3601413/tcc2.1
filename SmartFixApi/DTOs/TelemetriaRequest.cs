using System.ComponentModel.DataAnnotations;

namespace SmartFixApi.DTOs;

public class TelemetriaRequest
{
    [Required, Range(typeof(decimal), "0", "100")]
    public decimal? Bateria { get; set; }

    [Required, Range(typeof(decimal), "-100", "200")]
    public decimal? Temperatura { get; set; }

    [Required, Range(typeof(decimal), "0", "500")]
    public decimal? Velocidade { get; set; }
}
