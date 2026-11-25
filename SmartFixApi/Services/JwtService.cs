using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using SmartFixApi.Models;

namespace SmartFixApi.Services;

public class JwtService(JwtSettings settings)
{
    public string GerarToken(Usuario usuario)
    {
        var papel = usuario.IsAdmin ? "admin" : usuario.Papel;
        var key = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(settings.Secret));
        var credenciais = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, usuario.Id.ToString()),
            new(ClaimTypes.Email, usuario.Email),
            new(ClaimTypes.Name, usuario.Nome),
            new("is_admin", (papel == "admin").ToString()),
            new("papel", papel)
        };

        var token = new JwtSecurityToken(
            issuer: settings.Issuer,
            audience: settings.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(settings.ExpiraEmDias),
            signingCredentials: credenciais
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
