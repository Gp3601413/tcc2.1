namespace SmartFixApi.DTOs;

// DTO usado pelo endpoint publico de cadastro de oficinas.
public class RegisterMecanicaRequest
{
    public string NomeResponsavel { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Telefone { get; set; }
    public string Senha { get; set; } = string.Empty;
    public string NomeMecanica { get; set; } = string.Empty;
    public string Cnpj { get; set; } = string.Empty;
    public string? Especializacao { get; set; }
    public string Endereco { get; set; } = string.Empty;
}
