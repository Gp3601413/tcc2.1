using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFixApi.Data;
using SmartFixApi.DTOs;
using SmartFixApi.Models;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/mecanica")]
[Authorize(Policy = "Mecanica")]
public class MecanicaDashboardController(AppDbContext db) : ControllerBase
{
    private bool TentarObterUsuarioId(out Guid id) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out id);

    private bool PodeEditar(Mecanica mecanica) =>
        mecanica.StatusAprovacao != "bloqueada" || User.FindFirstValue("papel") == "admin";

    private ObjectResult Bloqueada() => StatusCode(403, new { erro = "Oficina bloqueada. Entre em contato com a administração." });

    [HttpGet("perfil")]
    public async Task<IActionResult> ObterPerfil(CancellationToken cancellationToken)
    {
        if (!TentarObterUsuarioId(out var usuarioId)) return Unauthorized();
        var mecanica = await db.Mecanicas.AsNoTracking().AsSplitQuery()
            .Include(m => m.Servicos).Include(m => m.Horarios)
            .SingleOrDefaultAsync(m => m.UsuarioId == usuarioId, cancellationToken);
        return mecanica is null ? NotFound(new { erro = "Perfil de mecânica não encontrado." }) : Ok(ProjetarPerfil(mecanica));
    }

    [HttpPut("perfil")]
    public async Task<IActionResult> AtualizarPerfil([FromBody] MecanicaPerfilRequest req, CancellationToken cancellationToken)
    {
        if (!TentarObterUsuarioId(out var usuarioId)) return Unauthorized();
        var mecanica = await db.Mecanicas.AsSplitQuery().Include(m => m.Servicos).Include(m => m.Horarios)
            .SingleOrDefaultAsync(m => m.UsuarioId == usuarioId, cancellationToken);
        if (mecanica is null) return NotFound(new { erro = "Perfil de mecânica não encontrado." });
        if (!PodeEditar(mecanica)) return Bloqueada();
        mecanica.Nome = req.Nome.Trim();
        mecanica.Especializacao = req.Especializacao?.Trim();
        mecanica.Endereco = req.Endereco?.Trim();
        mecanica.Latitude = req.Latitude;
        mecanica.Longitude = req.Longitude;
        mecanica.Telefone = req.Telefone?.Trim();
        await db.SaveChangesAsync(cancellationToken);
        return Ok(ProjetarPerfil(mecanica));
    }

    [HttpPut("servicos")]
    public async Task<IActionResult> AtualizarServicos([FromBody] List<ServicoMecanicaRequest> servicos, CancellationToken cancellationToken)
    {
        if (!TentarObterUsuarioId(out var usuarioId)) return Unauthorized();
        if (servicos.Count > 50 || servicos.Any(s => s is null || string.IsNullOrWhiteSpace(s.Nome)))
            return BadRequest(new { erro = "Informe no máximo 50 serviços, todos com nome." });
        var mecanica = await db.Mecanicas.Include(m => m.Servicos)
            .SingleOrDefaultAsync(m => m.UsuarioId == usuarioId, cancellationToken);
        if (mecanica is null) return NotFound(new { erro = "Perfil de mecânica não encontrado." });
        if (!PodeEditar(mecanica)) return Bloqueada();
        db.MecanicaServicos.RemoveRange(mecanica.Servicos);
        var novos = servicos.Select(s => new ServicoMecanica
        {
            Id = Guid.NewGuid(), MecanicaId = mecanica.Id, Nome = s.Nome.Trim(),
            Descricao = s.Descricao?.Trim(), PrecoEstimado = s.PrecoEstimado
        }).ToList();
        db.MecanicaServicos.AddRange(novos);
        await db.SaveChangesAsync(cancellationToken);
        return Ok(novos.Select(s => new { id = s.Id, nome = s.Nome, descricao = s.Descricao, precoEstimado = s.PrecoEstimado }));
    }

    [HttpPut("horarios")]
    public async Task<IActionResult> AtualizarHorarios([FromBody] List<HorarioMecanicaRequest> horarios, CancellationToken cancellationToken)
    {
        if (!TentarObterUsuarioId(out var usuarioId)) return Unauthorized();
        if (horarios.Count > 7 || horarios.Any(h => h is null || h.DiaSemana is < 0 or > 6) ||
            horarios.GroupBy(h => h.DiaSemana).Any(g => g.Count() > 1))
            return BadRequest(new { erro = "Os dias da semana devem ser únicos e estar entre 0 e 6." });
        if (horarios.Any(h => !h.Fechado && (h.Abertura is null || h.Fechamento is null || h.Abertura.Value >= h.Fechamento.Value)))
            return BadRequest(new { erro = "Informe abertura anterior ao fechamento, dentro do mesmo dia." });

        var mecanica = await db.Mecanicas.Include(m => m.Horarios)
            .SingleOrDefaultAsync(m => m.UsuarioId == usuarioId, cancellationToken);
        if (mecanica is null) return NotFound(new { erro = "Perfil de mecânica não encontrado." });
        if (!PodeEditar(mecanica)) return Bloqueada();
        var existentes = mecanica.Horarios.ToDictionary(h => h.DiaSemana);
        var diasRecebidos = horarios.Select(h => h.DiaSemana).ToHashSet();
        db.MecanicaHorarios.RemoveRange(mecanica.Horarios.Where(h => !diasRecebidos.Contains(h.DiaSemana)));
        var atualizados = new List<HorarioMecanica>();
        foreach (var h in horarios)
        {
            // Atualiza em lugar de apagar/reinserir: preserva o ID e evita conflito da chave única.
            if (!existentes.TryGetValue(h.DiaSemana, out var entidade))
            {
                entidade = new HorarioMecanica { Id = Guid.NewGuid(), MecanicaId = mecanica.Id, DiaSemana = h.DiaSemana };
                db.MecanicaHorarios.Add(entidade);
            }
            entidade.Abertura = h.Fechado ? null : h.Abertura;
            entidade.Fechamento = h.Fechado ? null : h.Fechamento;
            entidade.Fechado = h.Fechado;
            atualizados.Add(entidade);
        }
        await db.SaveChangesAsync(cancellationToken);
        return Ok(atualizados.OrderBy(h => h.DiaSemana).Select(h => new
        {
            diaSemana = h.DiaSemana, abertura = h.Abertura, fechamento = h.Fechamento, fechado = h.Fechado
        }));
    }

    private static object ProjetarPerfil(Mecanica m) => new
    {
        id = m.Id, nome = m.Nome, cnpj = m.Cnpj, especializacao = m.Especializacao,
        endereco = m.Endereco, latitude = m.Latitude, longitude = m.Longitude,
        telefone = m.Telefone, statusAprovacao = m.StatusAprovacao,
        servicos = m.Servicos.OrderBy(s => s.Nome).Select(s => new
        {
            id = s.Id, nome = s.Nome, descricao = s.Descricao, precoEstimado = s.PrecoEstimado
        }),
        horarios = m.Horarios.OrderBy(h => h.DiaSemana).Select(h => new
        {
            diaSemana = h.DiaSemana, abertura = h.Abertura, fechamento = h.Fechamento, fechado = h.Fechado
        })
    };
}
