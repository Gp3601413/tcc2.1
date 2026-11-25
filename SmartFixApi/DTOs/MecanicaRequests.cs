using System.ComponentModel.DataAnnotations;

namespace SmartFixApi.DTOs;

public class MecanicaPerfilRequest : IValidatableObject
{
    [Required, StringLength(180)] public string Nome { get; set; } = string.Empty;
    [StringLength(180)] public string? Especializacao { get; set; }
    [StringLength(255)] public string? Endereco { get; set; }
    [Range(-90, 90)] public decimal? Latitude { get; set; }
    [Range(-180, 180)] public decimal? Longitude { get; set; }
    [StringLength(30)] public string? Telefone { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Latitude.HasValue != Longitude.HasValue)
            yield return new ValidationResult("Informe latitude e longitude juntas.", new[] { nameof(Latitude), nameof(Longitude) });
    }
}

public class ServicoMecanicaRequest
{
    [Required, StringLength(180)] public string Nome { get; set; } = string.Empty;
    [StringLength(5000)] public string? Descricao { get; set; }
    [Range(typeof(decimal), "0", "99999999.99")] public decimal? PrecoEstimado { get; set; }
}

public class HorarioMecanicaRequest
{
    [Range(0, 6)] public int DiaSemana { get; set; }
    public TimeOnly? Abertura { get; set; }
    public TimeOnly? Fechamento { get; set; }
    public bool Fechado { get; set; }
}

public class AlterarStatusRequest
{
    [Required, StringLength(20)] public string Status { get; set; } = string.Empty;
}
