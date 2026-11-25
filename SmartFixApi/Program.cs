using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using SmartFixApi.Data;
using SmartFixApi.Infrastructure;
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
builder.Services.AddExceptionHandler<ApiExceptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseExceptionHandler();

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
app.MapGet("/health/ready", async (AppDbContext db, CancellationToken ct) =>
{
    var conectado = await db.Database.CanConnectAsync(ct);
    if (conectado)
        return (IResult)Results.Ok(new { status = "ready", database = "connected" });
    return Results.StatusCode(StatusCodes.Status503ServiceUnavailable);
});
app.MapControllers();


using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.ExecuteSqlRawAsync("""
        CREATE TABLE IF NOT EXISTS agendamentos (
            id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL PRIMARY KEY,
            usuario_id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
            mecanica_id CHAR(36) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
            servico VARCHAR(180) NOT NULL,
            data_hora DATETIME NOT NULL,
            observacoes TEXT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Pendente',
            criado_em DATETIME(6) NOT NULL,
            INDEX ix_agendamentos_mecanica_data (mecanica_id, data_hora),
            INDEX ix_agendamentos_usuario_data (usuario_id, data_hora),
            CONSTRAINT fk_agendamentos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
            CONSTRAINT fk_agendamentos_mecanica FOREIGN KEY (mecanica_id) REFERENCES mecanicas(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
        """);

    // Oficinas fictícias para demonstração do TCC. INSERT IGNORE torna a carga idempotente.
    await db.Database.ExecuteSqlRawAsync("""
        INSERT IGNORE INTO mecanicas
            (id, usuario_id, cnpj, nome, especializacao, endereco, telefone,
             latitude, longitude, avaliacao, status_aprovacao, criado_em)
        VALUES
            ('a1000000-0000-4000-8000-000000000001', NULL, 'DEMO-SFX-001',
             'VoltCare Centro Automotivo', 'Veículos Elétricos',
             'Endereço fictício — Vila Mariana, São Paulo/SP', NULL,
             NULL, NULL, 4.8, 'aprovada', UTC_TIMESTAMP()),
            ('a1000000-0000-4000-8000-000000000002', NULL, 'DEMO-SFX-002',
             'Bateria Prime', 'Baterias',
             'Endereço fictício — Pinheiros, São Paulo/SP', NULL,
             NULL, NULL, 4.9, 'aprovada', UTC_TIMESTAMP()),
            ('a1000000-0000-4000-8000-000000000003', NULL, 'DEMO-SFX-003',
             'E-Motor Tech', 'Motores',
             'Endereço fictício — Tatuapé, São Paulo/SP', NULL,
             NULL, NULL, 4.7, 'aprovada', UTC_TIMESTAMP()),
            ('a1000000-0000-4000-8000-000000000004', NULL, 'DEMO-SFX-004',
             'EletroDrive Sistemas', 'Sistemas Elétricos',
             'Endereço fictício — Moema, São Paulo/SP', NULL,
             NULL, NULL, 4.8, 'aprovada', UTC_TIMESTAMP()),
            ('a1000000-0000-4000-8000-000000000005', NULL, 'DEMO-SFX-005',
             'Freio & Suspensão EV', 'Freios',
             'Endereço fictício — Santana, São Paulo/SP', NULL,
             NULL, NULL, 4.6, 'aprovada', UTC_TIMESTAMP());
        """);
}

app.Run();
