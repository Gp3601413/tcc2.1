/**
 * Smart Fix (sFx) - JavaScript Principal
 */

document.addEventListener('DOMContentLoaded', function() {
    
    console.log('⚡ Smart Fix (sFx) - Soluções Inteligentes. Resultados Reais.');

    // =============================================
    // 1. MENU MOBILE
    // =============================================
    const menuToggle = document.getElementById('menuToggle');
    const nav = document.querySelector('.nav');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            nav.classList.toggle('open');
            const icon = this.querySelector('i');
            icon.classList.toggle('fa-bars');
            icon.classList.toggle('fa-times');
        });
    }

    // =============================================
    // 2. NEWSLETTER
    // =============================================
    const newsletterForm = document.getElementById('newsletterForm');
    if (newsletterForm) {
        newsletterForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const input = this.querySelector('input[type="email"]');
            if (input.value) {
                alert(`📧 Obrigado pela inscrição, ${input.value}!`);
                input.value = '';
            }
        });
    }

    // =============================================
    // 3. CARREGAR MECÂNICAS (via API real)
    // =============================================
    const mecanicasGrid = document.getElementById('mecanicasGrid');

    function estrelasPorNota(nota) {
        const cheias = Math.round(nota);
        return '★'.repeat(cheias) + '☆'.repeat(5 - cheias);
    }

    async function carregarMecanicas() {
        if (!mecanicasGrid) return;
        try {
            const resposta = await fetch(`${window.SFX_API_BASE_URL}/api/mechanics`);
            const dados = await resposta.json();
            const mecanicas = dados.mecanicas || [];

            mecanicas.forEach(mec => {
                const card = document.createElement('div');
                card.className = 'mecanica-card';
                card.innerHTML = `
                    <div class="card-header">
                        <div class="card-icon"><i class="fas fa-tools"></i></div>
                        <div>
                            <h3>${mec.nome}</h3>
                            <span class="especializacao">${mec.especializacao || ''}</span>
                        </div>
                    </div>
                    <div class="info"><i class="fas fa-map-marker-alt"></i> ${mec.endereco || ''}</div>
                    <div class="info"><i class="fas fa-phone"></i> ${mec.telefone || ''}</div>
                    <div class="avaliacao">
                        <span class="stars">${estrelasPorNota(mec.avaliacao)}</span>
                        <span style="font-weight:600; color: var(--sfx-azul-escuro);">${mec.avaliacao}</span>
                        <a href="#" class="btn-card">Agendar</a>
                    </div>
                `;
                mecanicasGrid.appendChild(card);
            });
        } catch (erro) {
            console.error('Erro ao carregar mecânicas:', erro);
        }
    }

    carregarMecanicas();

    // =============================================
    // 4. CARREGAR DEPOIMENTOS
    // =============================================
    const testimonialsGrid = document.getElementById('testimonialsGrid');
    
    const depoimentos = [
        {
            nome: 'Carlos Silva',
            veiculo: 'Tesla Model 3',
            texto: 'O Smart Fix salvou meu carro! Detectou um problema na bateria antes que fosse tarde.'
        },
        {
            nome: 'Mariana Costa',
            veiculo: 'BYD Han',
            texto: 'Amei o app! É muito fácil de usar e os alertas são precisos.'
        },
        {
            nome: 'Roberto Almeida',
            veiculo: 'Volvo XC40 Recharge',
            texto: 'Excelente serviço. Monitoramento em tempo real me dá muita tranquilidade.'
        }
    ];
    
    if (testimonialsGrid) {
        depoimentos.forEach((dep) => {
            const card = document.createElement('div');
            card.className = 'testimonial-card';
            const iniciais = dep.nome.split(' ').map(n => n[0]).join('');
            card.innerHTML = `
                <p class="quote">"${dep.texto}"</p>
                <div class="author">
                    <div class="avatar">${iniciais}</div>
                    <div class="author-info">
                        <h4>${dep.nome}</h4>
                        <span>${dep.veiculo}</span>
                    </div>
                </div>
            `;
            testimonialsGrid.appendChild(card);
        });
    }

    // =============================================
    // 5. HEADER SCROLL EFFECT
    // =============================================
    const header = document.getElementById('header');
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        if (currentScroll > 100) {
            header.style.background = 'rgba(10, 22, 40, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.background = 'var(--sfx-azul-escuro)';
            header.style.backdropFilter = 'none';
        }
    });

    // =============================================
    // 6. ANIMAÇÃO DE ENTRADA
    // =============================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    document.querySelectorAll('.step, .feature, .mecanica-card, .testimonial-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });

    console.log('✅ Smart Fix (sFx) - Site carregado com sucesso!');
});