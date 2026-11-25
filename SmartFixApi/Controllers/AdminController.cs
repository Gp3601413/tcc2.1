using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFixApi.Data;
using SmartFixApi.DTOs;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = "Admin")]
public class AdminController(AppDbContext db) : ControllerBase
{
    private static readonly string[] StatusValidos = ["pendente", "aprovada", "bloqueada"];

    [HttpGet("mecanicas")]
    public async Task<IActionResult> ListarMecanicas(CancellationToken cancellationToken,
        [FromQuery] string? status = null, [FromQuery, Range(1, 100000)] int pagina = 1,
        [FromQuery, Range(1, 100)] int tamanhoPagina = 20)
    {
        if (!string.IsNullOrWhiteSpace(status) && !StatusValidos.Contains(status))
            return BadRequest(new { erro = "Status inválido." });
        var query = db.Mecanicas.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(status)) query = query.Where(m => m.StatusAprovacao == status);
        var itens = await query.OrderByDescending(m => m.CriadoEm).ThenByDescending(m => m.Id)
            .Skip((pagina - 1) * tamanhoPagina).Take(tamanhoPagina + 1)
            .Select(m => new
            {
                id = m.Id, nome = m.Nome, cnpj = m.Cnpj, endereco = m.Endereco, telefone = m.Telefone,
                statusAprovacao = m.StatusAprovacao, criadoEm = DateTime.SpecifyKind(m.CriadoEm, DateTimeKind.Utc)
            }).ToListAsync(cancellationToken);
        return Ok(new { itens = itens.Take(tamanhoPagina), pagina, tamanhoPagina, temMais = itens.Count > tamanhoPagina });
    }

    [HttpPatch("mecanicas/{id:guid}/status")]
    public async Task<IActionResult> AlterarStatus(Guid id, [FromBody] AlterarStatusRequest req, CancellationToken cancellationToken)
    {
        var status = req.Status.Trim().ToLowerInvariant();
        if (!StatusValidos.Contains(status)) return BadRequest(new { erro = "Status inválido." });
        var mecanica = await db.Mecanicas.SingleOrDefaultAsync(m => m.Id == id, cancellationToken);
        if (mecanica is null) return NotFound(new { erro = "Mecânica não encontrada." });
        mecanica.StatusAprovacao = status;
        await db.SaveChangesAsync(cancellationToken);
        return Ok(new { id = mecanica.Id, statusAprovacao = mecanica.StatusAprovacao });
    }

    [HttpGet("usuarios")]
    public async Task<IActionResult> ListarUsuarios(CancellationToken cancellationToken,
        [FromQuery, Range(1, 100000)] int pagina = 1, [FromQuery, Range(1, 100)] int tamanhoPagina = 20)
    {
        var itens = await db.Usuarios.AsNoTracking().OrderByDescending(u => u.CriadoEm).ThenByDescending(u => u.Id)
            .Skip((pagina - 1) * tamanhoPagina).Take(tamanhoPagina + 1)
            .Select(u => new { u.Id, u.Nome, u.Email, u.Papel, criadoEm = DateTime.SpecifyKind(u.CriadoEm, DateTimeKind.Utc) })
            .ToListAsync(cancellationToken);
        return Ok(new { itens = itens.Take(tamanhoPagina), pagina, tamanhoPagina, temMais = itens.Count > tamanhoPagina });
    }

    [HttpGet("metricas")]
    public async Task<IActionResult> Metricas(CancellationToken cancellationToken)
    {
        var desde = DateTime.UtcNow.AddDays(-30);
        // Duas consultas agregadas; não executar consultas simultâneas no mesmo DbContext.
        var usuarios = await db.Usuarios.GroupBy(u => 1).Select(g => new
        {
            total = g.Count(), recentes = g.Count(u => u.CriadoEm >= desde)
        }).SingleOrDefaultAsync(cancellationToken);
        var mecanicas = await db.Mecanicas.GroupBy(m => 1).Select(g => new
        {
            total = g.Count(), pendentes = g.Count(m => m.StatusAprovacao == "pendente"),
            bloqueadas = g.Count(m => m.StatusAprovacao == "bloqueada")
        }).SingleOrDefaultAsync(cancellationToken);
        return Ok(new
        {
            totalUsuarios = usuarios?.total ?? 0, totalMecanicas = mecanicas?.total ?? 0,
            mecanicasPendentes = mecanicas?.pendentes ?? 0, mecanicasBloqueadas = mecanicas?.bloqueadas ?? 0,
            cadastrosUltimos30Dias = usuarios?.recentes ?? 0
        });
    }
}
