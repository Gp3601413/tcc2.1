using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFixApi.Data;
using SmartFixApi.DTOs;
using SmartFixApi.Models;
using SmartFixApi.Services;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly JwtService _jwt;

    public AuthController(AppDbContext db, JwtService jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nome) || string.IsNullOrWhiteSpace(req.Cpf) ||
            string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Senha) ||
            string.IsNullOrWhiteSpace(req.Marca) || string.IsNullOrWhiteSpace(req.Modelo))
        {
            return BadRequest(new { erro = "Preencha todos os campos obrigatórios." });
        }

        if (req.Senha.Length < 6)
        {
            return BadRequest(new { erro = "A senha deve ter pelo menos 6 caracteres." });
        }

        var emailNormalizado = req.Email.Trim().ToLowerInvariant();
        var cpfNormalizado = new string(req.Cpf.Where(char.IsAsciiDigit).ToArray());

        var existente = await _db.Usuarios
            .AnyAsync(u => u.Email == emailNormalizado ||
                EF.Property<string>(u, "CpfNormalizado") == cpfNormalizado);
        if (existente)
        {
            return Conflict(new { erro = "Já existe uma conta com esse e-mail ou CPF." });
        }

        var usuario = new Usuario
        {
            Id = Guid.NewGuid(),
            Nome = req.Nome,
            Cpf = req.Cpf,
            Email = emailNormalizado,
            Telefone = req.Telefone,
            SenhaHash = BCrypt.Net.BCrypt.HashPassword(req.Senha),
            Papel = "cliente",
            IsAdmin = false,
            CriadoEm = DateTime.UtcNow
        };

        var veiculo = new Veiculo
        {
            Id = Guid.NewGuid(),
            UsuarioId = usuario.Id,
            Cep = req.Cep,
            Cidade = req.Cidade,
            Estado = req.Estado,
            Endereco = req.Endereco,
            Marca = req.Marca,
            Modelo = req.Modelo,
            Ano = req.Ano,
            Placa = req.Placa,
            Cor = req.Cor,
            BateriaInicial = req.Bateria ?? 100,
            CriadoEm = DateTime.UtcNow
        };

        _db.Usuarios.Add(usuario);
        _db.Veiculos.Add(veiculo);
        await _db.SaveChangesAsync();

        var token = _jwt.GerarToken(usuario);

        return StatusCode(201, new
        {
            token,
            usuario = new { id = usuario.Id, nome = usuario.Nome, email = usuario.Email, papel = usuario.Papel, is_admin = usuario.IsAdmin }
        });
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Email) || string.IsNullOrWhiteSpace(req.Senha))
        {
            return BadRequest(new { erro = "Informe e-mail e senha." });
        }

        var emailNormalizado = req.Email.Trim().ToLowerInvariant();
        var usuario = await _db.Usuarios.FirstOrDefaultAsync(u => u.Email == emailNormalizado);

        if (usuario is null)
        {
            return Unauthorized(new { erro = "E-mail não encontrado.", campo = "email" });
        }

        if (!BCrypt.Net.BCrypt.Verify(req.Senha, usuario.SenhaHash))
        {
            return Unauthorized(new { erro = "Senha incorreta.", campo = "senha" });
        }

        var token = _jwt.GerarToken(usuario);
        var avatar = string.Concat(usuario.Nome.Split(' ').Take(2).Select(n => n[0])).ToUpperInvariant();

        return Ok(new
        {
            token,
            usuario = new
            {
                id = usuario.Id,
                nome = usuario.Nome,
                email = usuario.Email,
                papel = usuario.IsAdmin ? "admin" : usuario.Papel,
                is_admin = usuario.IsAdmin || usuario.Papel == "admin",
                avatar
            }
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me()
    {
        var idTexto = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (idTexto is null || !Guid.TryParse(idTexto, out var id))
        {
            return Unauthorized(new { erro = "Sessão inválida ou expirada." });
        }

        var usuario = await _db.Usuarios.FindAsync(id);
        if (usuario is null)
        {
            return NotFound(new { erro = "Usuário não encontrado." });
        }

        var avatar = string.Concat(usuario.Nome.Split(' ').Take(2).Select(n => n[0])).ToUpperInvariant();

        return Ok(new
        {
            usuario = new
            {
                id = usuario.Id,
                nome = usuario.Nome,
                email = usuario.Email,
                papel = usuario.IsAdmin ? "admin" : usuario.Papel,
                is_admin = usuario.IsAdmin || usuario.Papel == "admin",
                avatar
            }
        });
    }
}
