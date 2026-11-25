using System.ComponentModel.DataAnnotations;
using System.Text;

namespace SmartFixApi.Validation;

// BCrypt considera no máximo 72 bytes; caracteres acentuados podem usar mais de um byte.
public sealed class PasswordBytesAttribute : ValidationAttribute
{
    public PasswordBytesAttribute() => ErrorMessage = "A senha deve ter no máximo 72 bytes em UTF-8.";
    public override bool IsValid(object? value) => value is null || value is string senha && Encoding.UTF8.GetByteCount(senha) <= 72;
}
