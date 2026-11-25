using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFixApi.Data;
using SmartFixApi.Models;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/agendamentos")]
[Authorize]
public class AgendamentosController(AppDbContext db) : ControllerBase
{
    private bool TentarObterUsuarioId(out Guid id) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out id);

    public record CriarAgendamentoRequest(Guid MecanicaId, string Servico, DateTime DataHora, string? Observacoes);

    [HttpPost]
    public async Task<IActionResult> Criar([FromBody] CriarAgendamentoRequest req, CancellationToken ct)
    {
        if (!TentarObterUsuarioId(out var usuarioId)) return Unauthorized();
        if (req.MecanicaId == Guid.Empty || string.IsNullOrWhiteSpace(req.Servico) ||
            req.Servico.Trim().Length > 180 || req.DataHora <= DateTime.Now)
            return BadRequest(new { erro = "Informe uma oficina, serviço e data futura válidos." });

        var mecanica = await db.Mecanicas.SingleOrDefaultAsync(m =>
            m.Id == req.MecanicaId && m.StatusAprovacao == "aprovada", ct);
        if (mecanica is null) return NotFound(new { erro = "Oficina não encontrada ou não aprovada." });

        var agendamento = new Agendamento
        {
            Id = Guid.NewGuid(), UsuarioId = usuarioId, MecanicaId = mecanica.Id,
            Servico = req.Servico.Trim(), DataHora = DateTime.SpecifyKind(req.DataHora, DateTimeKind.Unspecified),
            Observacoes = string.IsNullOrWhiteSpace(req.Observacoes) ? null : req.Observacoes.Trim(),
            Status = "Pendente", CriadoEm = DateTime.UtcNow
        };
        db.Agendamentos.Add(agendamento);
        await db.SaveChangesAsync(ct);
        return CreatedAtAction(nameof(Meus), new { id = agendamento.Id }, new
        {
            id = agendamento.Id, status = agendamento.Status, servico = agendamento.Servico,
            dataHora = agendamento.DataHora, mecanica = mecanica.Nome
        });
    }

    [HttpGet("meus")]
    public async Task<IActionResult> Meus(CancellationToken ct)
    {
        if (!TentarObterUsuarioId(out var usuarioId)) return Unauthorized();
        var itens = await db.Agendamentos.AsNoTracking()
            .Where(a => a.UsuarioId == usuarioId)
            .OrderByDescending(a => a.DataHora)
            .Select(a => new { id = a.Id, servico = a.Servico, dataHora = a.DataHora,
                status = a.Status, mecanica = a.Mecanica!.Nome, observacoes = a.Observacoes })
            .ToListAsync(ct);
        return Ok(new { agendamentos = itens });
    }
}

[ApiController]
[Route("api/mecanica/agendamentos")]
[Authorize(Policy = "Mecanica")]
public class AgendamentosMecanicaController(AppDbContext db) : ControllerBase
{
    private bool TentarObterUsuarioId(out Guid id) =>
        Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out id);

    [HttpGet]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        if (!TentarObterUsuarioId(out var usuarioId)) return Unauthorized();
        var mecanica = await db.Mecanicas.AsNoTracking()
            .SingleOrDefaultAsync(m => m.UsuarioId == usuarioId, ct);
        if (mecanica is null) return NotFound(new { erro = "Perfil de mecânica não encontrado." });

        var itens = await db.Agendamentos.AsNoTracking()
            .Where(a => a.MecanicaId == mecanica.Id)
            .OrderBy(a => a.DataHora)
            .Select(a => new { id = a.Id, cliente = a.Usuario!.Nome, email = a.Usuario.Email,
                servico = a.Servico, dataHora = a.DataHora, observacoes = a.Observacoes,
                status = a.Status, criadoEm = a.CriadoEm })
            .ToListAsync(ct);
        return Ok(new { agendamentos = itens });
    }

    public record AtualizarStatusRequest(string Status);

    [HttpPut("{id:guid}/status")]
    public async Task<IActionResult> AtualizarStatus(Guid id, [FromBody] AtualizarStatusRequest req, CancellationToken ct)
    {
        if (!TentarObterUsuarioId(out var usuarioId)) return Unauthorized();
        if (req.Status is not ("Confirmado" or "Recusado"))
            return BadRequest(new { erro = "O status deve ser Confirmado ou Recusado." });

        var mecanica = await db.Mecanicas.SingleOrDefaultAsync(m => m.UsuarioId == usuarioId, ct);
        if (mecanica is null) return NotFound(new { erro = "Perfil de mecânica não encontrado." });

        var agendamento = await db.Agendamentos.SingleOrDefaultAsync(a =>
            a.Id == id && a.MecanicaId == mecanica.Id, ct);
        if (agendamento is null) return NotFound(new { erro = "Agendamento não encontrado para esta oficina." });
        if (agendamento.Status != "Pendente")
            return Conflict(new { erro = "Este agendamento já foi respondido." });

        agendamento.Status = req.Status;
        await db.SaveChangesAsync(ct);
        return Ok(new { id = agendamento.Id, status = agendamento.Status });
    }
}
