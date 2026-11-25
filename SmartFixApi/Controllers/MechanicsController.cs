using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SmartFixApi.Data;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/mechanics")]
public class MechanicsController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Listar(
        CancellationToken cancellationToken,
        [FromQuery] string? busca = null,
        [FromQuery] string? especializacao = null,
        [FromQuery] decimal? avaliacaoMinima = null,
        [FromQuery] int pagina = 1,
        [FromQuery] int tamanhoPagina = 12)
    {
        if (pagina < 1 || tamanhoPagina is < 1 or > 50)
            return BadRequest(new { erro = "Informe uma página válida e um tamanho entre 1 e 50." });
        if (avaliacaoMinima is < 0 or > 5)
            return BadRequest(new { erro = "A avaliação mínima deve estar entre 0 e 5." });
        if (busca?.Length > 100 || especializacao?.Length > 100)
            return BadRequest(new { erro = "Os filtros devem ter no máximo 100 caracteres." });

        var query = db.Mecanicas.AsNoTracking()
            .Where(m => m.StatusAprovacao == "aprovada");

        if (!string.IsNullOrWhiteSpace(busca))
        {
            var termo = busca.Trim();
            query = query.Where(m =>
                m.Nome.Contains(termo) ||
                (m.Endereco != null && m.Endereco.Contains(termo)) ||
                (m.Especializacao != null && m.Especializacao.Contains(termo)));
        }

        if (!string.IsNullOrWhiteSpace(especializacao))
        {
            var filtro = especializacao.Trim();
            query = query.Where(m => m.Especializacao != null && m.Especializacao.Contains(filtro));
        }

        if (avaliacaoMinima.HasValue)
            query = query.Where(m => m.Avaliacao >= avaliacaoMinima.Value);

        var itens = await query
            .OrderByDescending(m => m.Avaliacao)
            .ThenBy(m => m.Nome)
            .Skip((pagina - 1) * tamanhoPagina)
            .Take(tamanhoPagina + 1)
            .Select(m => new
            {
                id = m.Id,
                nome = m.Nome,
                especializacao = m.Especializacao,
                endereco = m.Endereco,
                telefone = m.Telefone,
                avaliacao = m.Avaliacao
            })
            .ToListAsync(cancellationToken);

        var temMais = itens.Count > tamanhoPagina;
        return Ok(new
        {
            mecanicas = itens.Take(tamanhoPagina),
            pagina,
            tamanhoPagina,
            temMais
        });
    }
}
