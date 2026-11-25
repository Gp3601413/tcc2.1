using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFixApi.Data;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/mechanics")]
public class MechanicsController : ControllerBase
{
    private readonly AppDbContext _db;

    public MechanicsController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Listar()
    {
        var mecanicas = await _db.Mecanicas
            .Where(m => m.StatusAprovacao == "aprovada")
            .OrderByDescending(m => m.Avaliacao)
            .Select(m => new
            {
                id = m.Id,
                nome = m.Nome,
                especializacao = m.Especializacao,
                endereco = m.Endereco,
                telefone = m.Telefone,
                avaliacao = m.Avaliacao
            })
            .ToListAsync();

        return Ok(new { mecanicas });
    }
}
