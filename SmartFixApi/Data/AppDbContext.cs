using Microsoft.EntityFrameworkCore;
using SmartFixApi.Models;

namespace SmartFixApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Usuario> Usuarios => Set<Usuario>();
    public DbSet<Veiculo> Veiculos => Set<Veiculo>();
    public DbSet<Telemetria> Telemetrias => Set<Telemetria>();
    public DbSet<Mecanica> Mecanicas => Set<Mecanica>();
    public DbSet<ServicoMecanica> MecanicaServicos => Set<ServicoMecanica>();
    public DbSet<HorarioMecanica> MecanicaHorarios => Set<HorarioMecanica>();
    public DbSet<Contato> Contatos => Set<Contato>();
    public DbSet<Agendamento> Agendamentos => Set<Agendamento>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Usuario>(entity =>
        {
            entity.ToTable("usuarios");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("char(36)");
            entity.Property(e => e.Nome).HasColumnName("nome");
            entity.Property(e => e.Cpf).HasColumnName("cpf");
            entity.Property<string>("CpfNormalizado")
                .HasColumnName("cpf_normalizado")
                .HasMaxLength(20)
                .HasComputedColumnSql("REPLACE(REPLACE(REPLACE(cpf, '.', ''), '-', ''), ' ', '')", stored: true);
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Telefone).HasColumnName("telefone");
            entity.Property(e => e.SenhaHash).HasColumnName("senha_hash");
            entity.Property(e => e.Papel).HasColumnName("papel").HasMaxLength(20).IsRequired();
            entity.Property(e => e.IsAdmin).HasColumnName("is_admin");
            entity.Property(e => e.CriadoEm).HasColumnName("criado_em");
            entity.HasIndex(e => e.Email).IsUnique();
            entity.HasIndex(e => e.Cpf).IsUnique();
            entity.HasIndex("CpfNormalizado").IsUnique().HasDatabaseName("uq_usuarios_cpf_normalizado");
            entity.HasOne(e => e.Mecanica).WithOne(m => m.Usuario)
                  .HasForeignKey<Mecanica>(m => m.UsuarioId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Veiculo>(entity =>
        {
            entity.ToTable("veiculos");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("char(36)");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id").HasColumnType("char(36)");
            entity.Property(e => e.Cep).HasColumnName("cep");
            entity.Property(e => e.Cidade).HasColumnName("cidade");
            entity.Property(e => e.Estado).HasColumnName("estado");
            entity.Property(e => e.Endereco).HasColumnName("endereco");
            entity.Property(e => e.Marca).HasColumnName("marca");
            entity.Property(e => e.Modelo).HasColumnName("modelo");
            entity.Property(e => e.Ano).HasColumnName("ano");
            entity.Property(e => e.Placa).HasColumnName("placa");
            entity.Property(e => e.Cor).HasColumnName("cor");
            entity.Property(e => e.BateriaInicial).HasColumnName("bateria_inicial").HasColumnType("decimal(5,2)");
            entity.Property(e => e.CriadoEm).HasColumnName("criado_em");

            entity.HasOne(e => e.Usuario)
                  .WithMany(u => u.Veiculos)
                  .HasForeignKey(e => e.UsuarioId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Telemetria>(entity =>
        {
            entity.ToTable("telemetria");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("char(36)");
            entity.Property(e => e.VeiculoId).HasColumnName("veiculo_id").HasColumnType("char(36)");
            entity.Property(e => e.Bateria).HasColumnName("bateria").HasColumnType("decimal(5,2)");
            entity.Property(e => e.Temperatura).HasColumnName("temperatura").HasColumnType("decimal(5,2)");
            entity.Property(e => e.Velocidade).HasColumnName("velocidade").HasColumnType("decimal(5,2)");
            entity.Property(e => e.RegistradoEm).HasColumnName("registrado_em");

            entity.HasOne(e => e.Veiculo)
                  .WithMany(v => v.Telemetrias)
                  .HasForeignKey(e => e.VeiculoId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Mecanica>(entity =>
        {
            entity.ToTable("mecanicas");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("char(36)");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id").HasColumnType("char(36)");
            entity.Property(e => e.Cnpj).HasColumnName("cnpj").HasMaxLength(20);
            entity.Property(e => e.Nome).HasColumnName("nome");
            entity.Property(e => e.Especializacao).HasColumnName("especializacao");
            entity.Property(e => e.Endereco).HasColumnName("endereco");
            entity.Property(e => e.Telefone).HasColumnName("telefone");
            entity.Property(e => e.Latitude).HasColumnName("latitude").HasColumnType("decimal(10,7)");
            entity.Property(e => e.Longitude).HasColumnName("longitude").HasColumnType("decimal(10,7)");
            entity.Property(e => e.Avaliacao).HasColumnName("avaliacao").HasColumnType("decimal(2,1)");
            entity.Property(e => e.StatusAprovacao).HasColumnName("status_aprovacao").HasMaxLength(20);
            entity.Property(e => e.CriadoEm).HasColumnName("criado_em");
            entity.HasIndex(e => e.UsuarioId).IsUnique();
            entity.HasIndex(e => e.Cnpj).IsUnique();
        });

        modelBuilder.Entity<ServicoMecanica>(entity =>
        {
            entity.ToTable("mecanica_servicos");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("char(36)");
            entity.Property(e => e.MecanicaId).HasColumnName("mecanica_id").HasColumnType("char(36)");
            entity.Property(e => e.Nome).HasColumnName("nome").HasMaxLength(180);
            entity.Property(e => e.Descricao).HasColumnName("descricao").HasColumnType("text");
            entity.Property(e => e.PrecoEstimado).HasColumnName("preco_estimado").HasColumnType("decimal(10,2)");
            entity.HasOne(e => e.Mecanica).WithMany(m => m.Servicos)
                  .HasForeignKey(e => e.MecanicaId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<HorarioMecanica>(entity =>
        {
            entity.ToTable("mecanica_horarios");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("char(36)");
            entity.Property(e => e.MecanicaId).HasColumnName("mecanica_id").HasColumnType("char(36)");
            entity.Property(e => e.DiaSemana).HasColumnName("dia_semana");
            entity.Property(e => e.Abertura).HasColumnName("abertura");
            entity.Property(e => e.Fechamento).HasColumnName("fechamento");
            entity.Property(e => e.Fechado).HasColumnName("fechado");
            entity.HasIndex(e => new { e.MecanicaId, e.DiaSemana }).IsUnique();
            entity.HasOne(e => e.Mecanica).WithMany(m => m.Horarios)
                  .HasForeignKey(e => e.MecanicaId).OnDelete(DeleteBehavior.Cascade);
        });


        modelBuilder.Entity<Agendamento>(entity =>
        {
            entity.ToTable("agendamentos");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("char(36)");
            entity.Property(e => e.UsuarioId).HasColumnName("usuario_id").HasColumnType("char(36)");
            entity.Property(e => e.MecanicaId).HasColumnName("mecanica_id").HasColumnType("char(36)");
            entity.Property(e => e.Servico).HasColumnName("servico").HasMaxLength(180).IsRequired();
            entity.Property(e => e.DataHora).HasColumnName("data_hora").HasColumnType("datetime");
            entity.Property(e => e.Observacoes).HasColumnName("observacoes").HasColumnType("text");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(20).IsRequired();
            entity.Property(e => e.CriadoEm).HasColumnName("criado_em");
            entity.HasIndex(e => new { e.MecanicaId, e.DataHora });
            entity.HasIndex(e => new { e.UsuarioId, e.DataHora });
            entity.HasOne(e => e.Usuario).WithMany().HasForeignKey(e => e.UsuarioId).OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(e => e.Mecanica).WithMany().HasForeignKey(e => e.MecanicaId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Contato>(entity =>
        {
            entity.ToTable("contatos");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id").HasColumnType("char(36)");
            entity.Property(e => e.Nome).HasColumnName("nome");
            entity.Property(e => e.Email).HasColumnName("email");
            entity.Property(e => e.Assunto).HasColumnName("assunto");
            entity.Property(e => e.Mensagem).HasColumnName("mensagem");
            entity.Property(e => e.CriadoEm).HasColumnName("criado_em");
        });
    }
}
