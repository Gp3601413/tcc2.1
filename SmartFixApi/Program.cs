using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using SmartFixApi.Data;
using SmartFixApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ---------- Banco de Dados (MySQL) ----------
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("ConnectionStrings:DefaultConnection não configurada.");

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));

// ---------- Autenticação JWT ----------
var jwtSettings = builder.Configuration.GetSection("Jwt").Get<JwtSettings>() ?? new JwtSettings();
jwtSettings.Validar();
builder.Services.AddSingleton(jwtSettings);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidateAudience = true,
        ValidAudience = jwtSettings.Audience,
        ValidateLifetime = true,
        RequireExpirationTime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(jwtSettings.Secret)),
        ValidAlgorithms = [SecurityAlgorithms.HmacSha256],
        ClockSkew = TimeSpan.FromSeconds(30)
    };
});

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("Admin", policy => policy.RequireClaim("papel", "admin"));
    options.AddPolicy("Mecanica", policy => policy.RequireClaim("papel", "mecanica"));
});
builder.Services.AddScoped<JwtService>();

// ---------- CORS (permite o front hospedado na Vercel chamar esta API) ----------
var origensPermitidas = builder.Configuration.GetSection("Cors:OrigensPermitidas").Get<string[]>()
    ?? Array.Empty<string>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("FrontendPolicy", policy =>
    {
        if (origensPermitidas.Length > 0)
        {
            policy.WithOrigins(origensPermitidas)
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        }
        else
        {
            // Sem origens configuradas: libera geral (útil só para testes locais rápidos)
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
    });
});

// ---------- Controllers + Swagger ----------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // No modo local, o ASP.NET Core também serve o frontend estático.
    // A raiz do projeto contém a pasta "frontend" ao lado de "SmartFixApi".
    var frontendPath = Path.GetFullPath(Path.Combine(app.Environment.ContentRootPath, "..", "frontend"));
    if (Directory.Exists(frontendPath))
    {
        var frontendProvider = new PhysicalFileProvider(frontendPath);
        app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = frontendProvider });
        app.UseStaticFiles(new StaticFileOptions { FileProvider = frontendProvider });
    }
}

app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapGet("/health", () => Results.Ok(new { status = "ok", service = "SmartFixApi" }));
app.MapControllers();

app.Run();
