using Microsoft.AspNetCore.Diagnostics;
using Microsoft.EntityFrameworkCore;
using MySqlConnector;

namespace SmartFixApi.Infrastructure;

public sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext context, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is OperationCanceledException && context.RequestAborted.IsCancellationRequested)
        {
            context.Response.StatusCode = 499;
            return true;
        }
        var mysql = exception as MySqlException ?? exception.InnerException as MySqlException;
        var (status, mensagem) = exception switch
        {
            DbUpdateConcurrencyException => (409, "O registro foi alterado. Atualize a página e tente novamente."),
            _ when mysql?.Number == 1062 => (409, "Já existe um cadastro com esses dados únicos. Verifique e-mail, CPF, CNPJ ou horário."),
            _ when mysql?.Number is 1406 or 1264 or 3819 => (400, "Um dos valores está fora do formato ou limite permitido."),
            _ when mysql is not null => (503, "O banco de dados está indisponível. Tente novamente em instantes."),
            _ => (500, "Não foi possível concluir a operação. Tente novamente.")
        };
        // Não enviar SQL, credenciais ou valores pessoais na resposta.
        logger.LogError("Falha {ExceptionType}; código MySQL {MySqlCode}; referência {TraceId}",
            exception.GetType().Name, mysql?.Number, context.TraceIdentifier);
        context.Response.StatusCode = status;
        await context.Response.WriteAsJsonAsync(new { erro = mensagem, referencia = context.TraceIdentifier }, cancellationToken);
        return true;
    }
}
