using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFixApi.Data;
using SmartFixApi.DTOs;
using SmartFixApi.Models;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/admin/simulador")]
[Authorize(Policy = "Admin")]
public class AdminSimulatorController(AppDbContext db) : ControllerBase
{
    [HttpGet("veiculos")]
    public async Task<IActionResult> ListarVeiculos(CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var usuarioId))
            return Unauthorized(new { erro = "Sessão inválida ou expirada." });

        // O simulador atua apenas nos veículos pertencentes à própria conta administradora.
        var veiculos = await db.Veiculos.AsNoTracking()
            .Where(v => v.UsuarioId == usuarioId)
            .OrderByDescending(v => v.CriadoEm)
            .Select(v => new
            {
                id = v.Id,
                marca = v.Marca,
                modelo = v.Modelo,
                ano = v.Ano,
                placa = v.Placa,
                bateriaInicial = v.BateriaInicial
            })
            .ToListAsync(cancellationToken);

        return Ok(new { veiculos });
    }

    [HttpPost("telemetria")]
    public async Task<IActionResult> RegistrarLeitura([FromBody] SimularTelemetriaRequest req,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var usuarioId))
            return Unauthorized(new { erro = "Sessão inválida ou expirada." });
        if (req.VeiculoId == Guid.Empty)
            return BadRequest(new { erro = "Selecione um veículo para simular." });

        var veiculoExiste = await db.Veiculos.AnyAsync(
            v => v.Id == req.VeiculoId && v.UsuarioId == usuarioId, cancellationToken);
        if (!veiculoExiste)
            return NotFound(new { erro = "Veículo de demonstração não encontrado nesta conta." });

        var leitura = new Telemetria
        {
            Id = Guid.NewGuid(),
            VeiculoId = req.VeiculoId,
            Bateria = req.Bateria,
            Temperatura = req.Temperatura,
            Velocidade = req.Velocidade,
            RegistradoEm = DateTime.UtcNow
        };
        db.Telemetrias.Add(leitura);
        await db.SaveChangesAsync(cancellationToken);

        return StatusCode(StatusCodes.Status201Created, new
        {
            id = leitura.Id,
            veiculoId = leitura.VeiculoId,
            bateria = leitura.Bateria,
            temperatura = leitura.Temperatura,
            velocidade = leitura.Velocidade,
            registradoEm = leitura.RegistradoEm
        });
    }
}
