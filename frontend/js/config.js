/**
 * Smart Fix (sFx) - Configuração da API
 * Como o backend agora é uma API em C# (ASP.NET Core) hospedada separadamente
 * do front (que continua estático, ex: na Vercel), todas as chamadas usam
 * essa URL base em vez de caminhos relativos "/api/...".
 *
 * IMPORTANTE: troque o valor abaixo pelo endereço real da sua API quando
 * publicá-la (ex: "https://smartfix-api.azurewebsites.net" ou a URL do
 * Render/Railway). Durante o desenvolvimento local, aponte para o endereço
 * que o "dotnet run" mostrar no terminal (ex: "https://localhost:5001").
 */
window.SFX_API_BASE_URL = 'http://localhost:5001';
