using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFixApi.Data;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/vehicles")]
[Authorize]
public class VehiclesController : ControllerBase
{
    private readonly AppDbContext _db;

    public VehiclesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var idTexto = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (idTexto is null || !Guid.TryParse(idTexto, out var usuarioId))
        {
            return Unauthorized(new { erro = "Sessão inválida ou expirada." });
        }

        var veiculos = await _db.Veiculos
            .Where(v => v.UsuarioId == usuarioId)
            .OrderByDescending(v => v.CriadoEm)
            .Select(v => new
            {
                id = v.Id,
                marca = v.Marca,
                modelo = v.Modelo,
                ano = v.Ano,
                placa = v.Placa,
                cor = v.Cor,
                bateria_inicial = v.BateriaInicial,
                cidade = v.Cidade,
                estado = v.Estado
            })
            .ToListAsync();

        return Ok(new { veiculos });
    }
}
