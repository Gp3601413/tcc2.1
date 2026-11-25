using Microsoft.AspNetCore.Mvc;
using SmartFixApi.Data;
using SmartFixApi.DTOs;
using SmartFixApi.Models;

namespace SmartFixApi.Controllers;

[ApiController]
[Route("api/contact")]
public class ContactController : ControllerBase
{
    private readonly AppDbContext _db;

    public ContactController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> Enviar([FromBody] ContactRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.Nome) || string.IsNullOrWhiteSpace(req.Email) ||
            string.IsNullOrWhiteSpace(req.Mensagem))
        {
            return BadRequest(new { erro = "Preencha nome, e-mail e mensagem." });
        }

        var contato = new Contato
        {
            Id = Guid.NewGuid(),
            Nome = req.Nome,
            Email = req.Email,
            Assunto = req.Assunto,
            Mensagem = req.Mensagem,
            CriadoEm = DateTime.UtcNow
        };

        _db.Contatos.Add(contato);
        await _db.SaveChangesAsync();

        return StatusCode(201, new { sucesso = true });
    }
}
