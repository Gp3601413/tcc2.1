using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFixApi.Data;
using SmartFixApi.DTOs;
using SmartFixApi.Models;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db)
    {
        _db = db;
    }

    private Guid? ObterUsuarioId()
    {
        var idTexto = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return (idTexto is not null && Guid.TryParse(idTexto, out var id)) ? id : null;
    }

    [HttpGet]
    public async Task<IActionResult> Obter(CancellationToken cancellationToken, [FromQuery] int historico = 20)
    {
        var usuarioId = ObterUsuarioId();
        if (usuarioId is null) return Unauthorized(new { erro = "Sessão inválida ou expirada." });

        var veiculo = await _db.Veiculos
            .Where(v => v.UsuarioId == usuarioId)
            .OrderByDescending(v => v.CriadoEm)
            .ThenByDescending(v => v.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (veiculo is null)
        {
            return NotFound(new { erro = "Nenhum veículo cadastrado para este usuário." });
        }

        var limite = Math.Clamp(historico, 1, 100);
        var historicoLeituras = await _db.Telemetrias
            .Where(t => t.VeiculoId == veiculo.Id)
            .OrderByDescending(t => t.RegistradoEm)
            .ThenByDescending(t => t.Id)
            .Take(limite)
            .OrderBy(t => t.RegistradoEm)
            .ThenBy(t => t.Id)
            .Select(t => new
            {
                bateria = t.Bateria,
                temperatura = t.Temperatura,
                velocidade = t.Velocidade,
                registrado_em = t.RegistradoEm
            })
            .ToListAsync(cancellationToken);

        // A consulta do painel é somente leitura; uma ausência de telemetria não cria dados fictícios.
        var ultimaLeitura = historicoLeituras.LastOrDefault();

        // Alertas simples baseados nos valores atuais
        var alertas = new List<object>();
        decimal? saude = null;
        if (ultimaLeitura is not null)
        {
            if (ultimaLeitura.bateria <= 20)
                alertas.Add(new { tipo = "bateria_baixa", mensagem = "Bateria abaixo de 20%. Considere recarregar em breve." });
            if (ultimaLeitura.temperatura >= 40)
                alertas.Add(new { tipo = "temperatura_alta", mensagem = "Temperatura do sistema acima do normal (≥40°C)." });

            var penalidadeTemp = ultimaLeitura.temperatura > 40 ? (ultimaLeitura.temperatura - 40) : 0;
            saude = Math.Clamp(Math.Round(ultimaLeitura.bateria - penalidadeTemp), 0, 100);
        }

        return Ok(new
        {
            veiculo = new { marca = veiculo.Marca, modelo = veiculo.Modelo, placa = veiculo.Placa, ano = veiculo.Ano },
            leituraAtual = ultimaLeitura,
            saude,
            alertas,
            historico = historicoLeituras
        });
    }

    [HttpPost]
    public async Task<IActionResult> Registrar([FromBody] TelemetriaRequest req)
    {
        var usuarioId = ObterUsuarioId();
        if (usuarioId is null) return Unauthorized(new { erro = "Sessão inválida ou expirada." });

        var veiculo = await _db.Veiculos
            .Where(v => v.UsuarioId == usuarioId)
            .OrderByDescending(v => v.CriadoEm)
            .FirstOrDefaultAsync();

        if (veiculo is null)
        {
            return NotFound(new { erro = "Nenhum veículo cadastrado para este usuário." });
        }

        var leitura = new Telemetria
        {
            Id = Guid.NewGuid(),
            VeiculoId = veiculo.Id,
            Bateria = req.Bateria!.Value,
            Temperatura = req.Temperatura!.Value,
            Velocidade = req.Velocidade!.Value,
            RegistradoEm = DateTime.UtcNow
        };

        _db.Telemetrias.Add(leitura);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { leitura });
    }
}
