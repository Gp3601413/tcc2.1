/**
 * Smart Fix (sFx) - Interações da página pública
 */
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.querySelector('.nav');

    if (menuToggle && nav) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.addEventListener('click', () => {
            const aberto = nav.classList.toggle('open');
            menuToggle.setAttribute('aria-expanded', String(aberto));
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars', !aberto);
                icon.classList.toggle('fa-times', aberto);
            }
        });
        nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
            nav.classList.remove('open');
            menuToggle.setAttribute('aria-expanded', 'false');
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.add('fa-bars');
                icon.classList.remove('fa-times');
            }
        }));
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                nav.classList.remove('open');
                menuToggle.setAttribute('aria-expanded', 'false');
                const icon = menuToggle.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            }
        });
    }

    const mecanicasGrid = document.getElementById('mecanicasGrid');
    // A listagem completa tem filtros e paginação próprios em mecanicas.js.
    if (mecanicasGrid && !document.getElementById('buscaMecanica')) {
        carregarDestaques(mecanicasGrid);
    }

    async function carregarDestaques(grid) {
        grid.setAttribute('aria-busy', 'true');
        const estado = document.createElement('p');
        estado.className = 'status-message';
        estado.textContent = 'Carregando oficinas aprovadas...';
        grid.replaceChildren(estado);

        try {
            const dados = await Sfx.request('/api/mechanics?pagina=1&tamanhoPagina=3');
            const mecanicas = Array.isArray(dados?.mecanicas) ? dados.mecanicas : [];
            if (!mecanicas.length) {
                estado.textContent = 'Ainda não há oficinas aprovadas para exibir. Volte em breve.';
                return;
            }

            const cards = mecanicas.map(mec => {
                const card = document.createElement('article');
                card.className = 'mecanica-card';

                const header = document.createElement('div');
                header.className = 'card-header';
                const icon = document.createElement('div');
                icon.className = 'card-icon';
                const glyph = document.createElement('i');
                glyph.className = 'fas fa-tools';
                glyph.setAttribute('aria-hidden', 'true');
                icon.append(glyph);

                const titleArea = document.createElement('div');
                const title = document.createElement('h3');
                title.textContent = mec.nome || 'Oficina parceira';
                const specialty = document.createElement('span');
                specialty.className = 'especializacao';
                specialty.textContent = mec.especializacao || 'Atendimento automotivo';
                titleArea.append(title, specialty);
                header.append(icon, titleArea);

                const address = document.createElement('div');
                address.className = 'info';
                address.textContent = mec.endereco || 'Endereço não informado';
                const phone = document.createElement('div');
                phone.className = 'info';
                phone.textContent = mec.telefone || 'Telefone não informado';

                const footer = document.createElement('div');
                footer.className = 'avaliacao';
                const rating = Number(mec.avaliacao);
                const nota = Number.isFinite(rating) ? Math.min(5, Math.max(0, rating)) : null;
                const stars = document.createElement('span');
                stars.className = 'stars';
                stars.textContent = nota === null ? 'Avaliação indisponível' :
                    '★'.repeat(Math.round(nota)) + '☆'.repeat(5 - Math.round(nota));
                footer.append(stars);
                if (nota !== null) {
                    const score = document.createElement('span');
                    score.textContent = nota.toFixed(1);
                    footer.append(score);
                }
                const link = document.createElement('a');
                link.className = 'btn-card';
                link.href = 'login.html';
                link.textContent = 'Agendar';
                footer.append(link);
                card.append(header, address, phone, footer);
                return card;
            });
            grid.replaceChildren(...cards);
        } catch (error) {
            estado.textContent = error.message || 'Não foi possível carregar as oficinas agora.';
            const retry = document.createElement('button');
            retry.type = 'button';
            retry.className = 'btn-primary';
            retry.textContent = 'Tentar novamente';
            retry.addEventListener('click', () => carregarDestaques(grid));
            grid.append(retry);
        } finally {
            grid.setAttribute('aria-busy', 'false');
        }
    }

    const header = document.getElementById('header');
    if (header) {
        const atualizarHeader = () => {
            const rolou = window.scrollY > 40;
            header.style.background = rolou ? 'rgba(10, 22, 40, 0.96)' : 'var(--sfx-azul-escuro)';
            header.style.backdropFilter = rolou ? 'blur(12px)' : 'none';
        };
        atualizarHeader();
        window.addEventListener('scroll', atualizarHeader, { passive: true });
    }

    const ano = document.getElementById('anoAtual');
    if (ano) ano.textContent = String(new Date().getFullYear());

    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduzirMovimento && 'IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -35px 0px' });

        document.querySelectorAll('.step, .feature, .mecanica-card, .recurso-card').forEach(element => {
            element.classList.add('reveal-on-scroll');
            observer.observe(element);
        });
    }
});
