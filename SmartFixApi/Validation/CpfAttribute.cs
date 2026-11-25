using System.ComponentModel.DataAnnotations;

namespace SmartFixApi.Validation;

public sealed class CpfAttribute : ValidationAttribute
{
    public CpfAttribute() => ErrorMessage = "Informe um CPF válido.";
    public static string Normalizar(string cpf) => new(cpf.Where(c => c is >= '0' and <= '9').ToArray());

    public override bool IsValid(object? value)
    {
        if (value is not string texto || texto.Any(c => !(c is >= '0' and <= '9' or '.' or '-' or ' '))) return false;
        var cpf = Normalizar(texto);
        if (cpf.Length != 11 || cpf.Distinct().Count() == 1) return false;
        for (var tamanho = 9; tamanho <= 10; tamanho++)
        {
            var soma = 0;
            for (var i = 0; i < tamanho; i++) soma += (cpf[i] - '0') * (tamanho + 1 - i);
            var digito = (soma * 10) % 11;
            if (digito == 10) digito = 0;
            if (cpf[tamanho] - '0' != digito) return false;
        }
        return true;
    }
}
