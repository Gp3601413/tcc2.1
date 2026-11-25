using System.ComponentModel.DataAnnotations;

namespace SmartFixApi.DTOs;

public class ContactRequest
{
    [Required, StringLength(255)]
    public string Nome { get; set; } = string.Empty;

    [Required, EmailAddress, StringLength(255)]
    public string Email { get; set; } = string.Empty;

    [StringLength(255)]
    public string? Assunto { get; set; }

    [Required, MinLength(1)]
    public string Mensagem { get; set; } = string.Empty;
}
