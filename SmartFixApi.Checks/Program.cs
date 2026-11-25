using System.ComponentModel.DataAnnotations;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using SmartFixApi.Data;
using SmartFixApi.DTOs;
using SmartFixApi.Models;
using SmartFixApi.Services;
using SmartFixApi.Validation;

var total = 0;
void Check(bool result, string name)
{
    if (!result) throw new InvalidOperationException("FALHOU: " + name);
    total++;
    Console.WriteLine("OK: " + name);
}
bool Valid(object value) => Validator.TryValidateObject(value, new ValidationContext(value), new List<ValidationResult>(), true);
void RejeitaToken(string value, TokenValidationParameters parameters, string name)
{
    try { new JwtSecurityTokenHandler().ValidateToken(value, parameters, out _); }
    catch (SecurityTokenException) { Check(true, name); return; }
    throw new InvalidOperationException("FALHOU: " + name);
}

Check(new CpfAttribute().IsValid("529.982.247-25"), "CPF de teste com máscara");
Check(!new CpfAttribute().IsValid("111.111.111-11"), "rejeita CPF repetido");
Check(!new CpfAttribute().IsValid("52998224724"), "rejeita dígito verificador incorreto");
Check(!new PasswordBytesAttribute().IsValid(new string('á', 37)), "limita senha em bytes UTF-8");
Check(Valid(new LoginRequest { Email = "teste@example.test", Senha = "antiga" }), "login mantém senha legada");
Check(!Valid(new TelemetriaRequest()), "telemetria não aceita campos ausentes como zero");
Check(!Valid(new TelemetriaRequest { Bateria = 101, Temperatura = 25, Velocidade = 0 }), "limite de bateria");
Check(Valid(new TelemetriaRequest { Bateria = 0, Temperatura = -10, Velocidade = 0 }), "zero é uma leitura válida");
Check(!Valid(new ServicoMecanicaRequest { Nome = "Serviço", PrecoEstimado = -1 }), "preço não negativo");
Check(!Valid(new MecanicaPerfilRequest { Nome = "Oficina", Latitude = 10 }), "coordenadas precisam de um par");
Check(!Valid(new MecanicaPerfilRequest { Nome = "Oficina", Latitude = 91, Longitude = 0 }), "limite de latitude");
Check(!Valid(new ContactRequest { Nome = "João", Email = "invalido", Mensagem = "Teste" }), "formato de e-mail");

var horario = JsonSerializer.Deserialize<HorarioMecanicaRequest>(
    """{"diaSemana":1,"abertura":"08:00:00","fechamento":"18:00:00","fechado":false}""",
    new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
Check(horario.Abertura == new TimeOnly(8, 0), "formato de horário enviado pelo frontend");

// Chave efêmera de teste: não é usada pela API nem gravada no projeto.
var settings = new JwtSettings { Secret = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48)) };
settings.Validar();
var usuario = new Usuario { Id = Guid.NewGuid(), Nome = "João  Silva", Email = "teste@example.test", Papel = "cliente" };
var token = new JwtService(settings).GerarToken(usuario);
var parameters = new TokenValidationParameters
{
    ValidateIssuer = true, ValidIssuer = settings.Issuer,
    ValidateAudience = true, ValidAudience = settings.Audience,
    ValidateLifetime = true, ValidateIssuerSigningKey = true,
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Secret)),
    ValidAlgorithms = new[] { SecurityAlgorithms.HmacSha256 }
};
var principal = new JwtSecurityTokenHandler().ValidateToken(token, parameters, out _);
Check(principal.FindFirstValue("papel") == "cliente", "JWT assinado preserva papel");
var wrongAudience = parameters.Clone();
wrongAudience.ValidAudience = "outra-api";
RejeitaToken(token, wrongAudience, "JWT com audiência errada é recusado");
var wrongIssuer = parameters.Clone();
wrongIssuer.ValidIssuer = "outro-emissor";
RejeitaToken(token, wrongIssuer, "JWT com emissor errado é recusado");
var wrongKey = parameters.Clone();
wrongKey.IssuerSigningKey = new SymmetricSecurityKey(System.Security.Cryptography.RandomNumberGenerator.GetBytes(48));
RejeitaToken(token, wrongKey, "assinatura com chave errada é recusada");

// Gerar SQL não abre conexão: valida parte do modelo e da tradução do provedor MySQL.
var options = new DbContextOptionsBuilder<AppDbContext>().UseMySql(
    "Server=127.0.0.1;Database=smartfix_checks;User ID=checks;Password=not-used;",
    new MySqlServerVersion(new Version(8, 0, 36))).Options;
using var db = new AppDbContext(options);
var cpfSql = db.Usuarios.Where(u => EF.Property<string>(u, "CpfNormalizado") == "52998224725").ToQueryString();
Check(cpfSql.Contains("cpf_normalizado"), "busca usa coluna de CPF normalizado");
var desde = DateTime.UtcNow.AddDays(-30);
var metricsSql = db.Usuarios.GroupBy(u => 1).Select(g => new { total = g.Count(), recentes = g.Count(u => u.CriadoEm >= desde) }).ToQueryString();
Check(metricsSql.Contains("COUNT", StringComparison.OrdinalIgnoreCase), "métricas traduzidas para SQL");
var historySql = db.Telemetrias.Where(t => t.VeiculoId == usuario.Id)
    .OrderByDescending(t => t.RegistradoEm).ThenByDescending(t => t.Id).Take(20)
    .Select(t => new { t.Bateria, data = DateTime.SpecifyKind(t.RegistradoEm, DateTimeKind.Utc) }).ToQueryString();
Check(historySql.Contains("LIMIT", StringComparison.OrdinalIgnoreCase), "histórico limitado no banco");
Console.WriteLine($"Concluído: {total} verificações. Ainda é necessário testar a integração com MySQL.");
