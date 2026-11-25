namespace SmartFixApi.DTOs;

public class RegisterRequest
{
    public string Nome { get; set; } = string.Empty;
    public string Cpf { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Telefone { get; set; }
    public string Senha { get; set; } = string.Empty;

    public string? Cep { get; set; }
    public string? Cidade { get; set; }
    public string? Estado { get; set; }
    public string? Endereco { get; set; }

    public string Marca { get; set; } = string.Empty;
    public string Modelo { get; set; } = string.Empty;
    public string? Ano { get; set; }
    public string? Placa { get; set; }
    public decimal? Bateria { get; set; }
    public string? Cor { get; set; }
}
