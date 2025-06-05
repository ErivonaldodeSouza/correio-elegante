// Sistema de Correio do Amor com Mercado Pago
document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('form');
    const submitButton = document.querySelector('button[type="submit"]');
    
    // CONFIGURAÇÃO MERCADO PAGO
    // ⚠️ IMPORTANTE: Substitua pela sua chave pública real
    const MP_PUBLIC_KEY = 'TEST-your-public-key-here'; // Substitua pela sua chave pública
    const FORMSPREE_URL = 'https://formspree.io/f/mpwrwjyz';
    const VALOR_SERVICO = 5.00; // R$ 5,00
    
    // Estado do sistema
    let dadosFormulario = {};
    let pagamentoAprovado = false;
    let mp = null;
    let bricksBuilder = null;
    
    // Inicializar Mercado Pago
    function inicializarMercadoPago() {
        try {
            if (typeof MercadoPago === 'undefined') {
                mostrarErro('Erro ao carregar Mercado Pago. Verifique sua conexão.');
                return false;
            }
            
            mp = new MercadoPago(MP_PUBLIC_KEY);
            bricksBuilder = mp.bricks();
            console.log('✅ Mercado Pago inicializado com sucesso');
            return true;
            
        } catch (error) {
            console.error('Erro ao inicializar Mercado Pago:', error);
            mostrarErro('Erro ao inicializar sistema de pagamento.');
            return false;
        }
    }
    
    // Criar preferência de pagamento
    async function criarPreferencia(dados) {
        try {
            // Em produção, isso deve ser feito no backend por segurança
            const preference = {
                items: [{
                    title: `Correio do Amor - Declaração para ${dados.name}`,
                    description: 'Serviço de entrega de declaração de amor',
                    quantity: 1,
                    unit_price: VALOR_SERVICO
                }],
                payer: {
                    email: 'cliente@email.com' // Email do cliente
                },
                back_urls: {
                    success: window.location.href,
                    failure: window.location.href,
                    pending: window.location.href
                },
                auto_return: 'approved',
                notification_url: 'https://seu-webhook.com/notifications', // Configure seu webhook
                metadata: {
                    nome_destinatario: dados.name,
                    mensagem: dados.message,
                    timestamp: new Date().toISOString()
                }
            };
            
            return preference;
            
        } catch (error) {
            console.error('Erro ao criar preferência:', error);
            throw new Error('Erro ao processar pagamento');
        }
    }
    
    // Renderizar Payment Brick do Mercado Pago
    async function renderizarPaymentBrick(preference) {
        const paymentContainer = document.getElementById('payment-brick-container');
        
        if (!paymentContainer) {
            mostrarErro('Container de pagamento não encontrado.');
            return;
        }
        
        try {
            await bricksBuilder.create('payment', 'payment-brick-container', {
                initialization: {
                    amount: VALOR_SERVICO,
                    preference: preference
                },
                customization: {
                    paymentMethods: {
                        creditCard: 'all',
                        debitCard: 'all',
                        ticket: 'all',
                        bankTransfer: 'all',
                        mercadoPago: 'all'
                    }
                },
                callbacks: {
                    onReady: () => {
                        console.log('Payment Brick pronto');
                        // Habilitar scroll para a seção de pagamento
                        paymentContainer.scrollIntoView({ behavior: 'smooth' });
                    },
                    onSubmit: async ({ selectedPaymentMethod, formData }) => {
                        return await processarPagamento(formData);
                    },
                    onError: (error) => {
                        console.error('Erro no Payment Brick:', error);
                        mostrarErro('Erro no processamento do pagamento.');
                    }
                }
            });
            
        } catch (error) {
            console.error('Erro ao renderizar Payment Brick:', error);
            mostrarErro('Erro ao carregar sistema de pagamento.');
        }
    }
    
    // Processar pagamento
    async function processarPagamento(formData) {
        try {
            mostrarCarregamento(true);
            
            // Em produção, isso deve ser feito no backend
            const response = await fetch('/process_payment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    metadata: dadosFormulario
                })
            });
            
            const result = await response.json();
            
            if (result.status === 'approved') {
                pagamentoAprovado = true;
                await enviarParaFormspree({
                    ...dadosFormulario,
                    payment_id: result.id,
                    payment_status: result.status
                });
                mostrarSucesso();
                
            } else if (result.status === 'pending') {
                mostrarPendente(result);
                
            } else {
                mostrarErro('Pagamento não aprovado. Tente novamente.');
            }
            
        } catch (error) {
            console.error('Erro ao processar pagamento:', error);
            mostrarErro('Erro ao processar pagamento. Tente novamente.');
            
        } finally {
            mostrarCarregamento(false);
        }
        
        return false; // Previne redirecionamento
    }
    
    // Enviar dados para Formspree
    async function enviarParaFormspree(dados) {
        try {
            const response = await fetch(FORMSPREE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    nome_destinatario: dados.name,
                    mensagem: dados.message,
                    status_pagamento: dados.payment_status || 'APROVADO',
                    id_pagamento: dados.payment_id || 'N/A',
                    timestamp: new Date().toLocaleString('pt-BR'),
                    valor: `R$ ${VALOR_SERVICO.toFixed(2)}`,
                    _subject: `💖 Nova Declaração de Amor - ${dados.name}`
                })
            });
            
            if (!response.ok) {
                throw new Error('Erro ao enviar dados');
            }
            
        } catch (error) {
            console.error('Erro ao enviar para Formspree:', error);
            mostrarErro('Declaração paga, mas houve erro no envio. Entre em contato.');
        }
    }
    
    // Mostrar seção de pagamento
    function mostrarPagamento(dados) {
        const existingContainer = document.getElementById('payment-section');
        if (existingContainer) {
            existingContainer.remove();
        }
        
        const paymentSection = document.createElement('div');
        paymentSection.id = 'payment-section';
        paymentSection.style.cssText = `
            background: #f8f9fa;
            border: 2px solid #e91e63;
            border-radius: 15px;
            padding: 30px;
            margin: 30px 0;
            text-align: center;
        `;
        
        paymentSection.innerHTML = `
            <h2 style="color: #e91e63; margin-bottom: 20px;">
                💳 Finalizar Pagamento
            </h2>
            <p style="font-size: 18px; margin-bottom: 25px;">
                <strong>Declaração para:</strong> ${dados.name}<br>
                <strong>Valor:</strong> R$ ${VALOR_SERVICO.toFixed(2).replace('.', ',')}
            </p>
            <div id="payment-brick-container"></div>
            <p style="font-size: 14px; color: #666; margin-top: 20px;">
                🔒 Pagamento seguro processado pelo Mercado Pago
            </p>
        `;
        
        // Inserir após o formulário
        const formularioDiv = document.querySelector('.formulario');
        formularioDiv.after(paymentSection);
        
        // Renderizar Payment Brick
        criarPreferencia(dados).then(preference => {
            renderizarPaymentBrick(preference);
        }).catch(error => {
            console.error('Erro ao criar pagamento:', error);
            mostrarErro('Erro ao inicializar pagamento.');
        });
    }
    
    // Funções de feedback visual
    function mostrarCarregamento(show) {
        const loadingDiv = document.getElementById('loading');
        
        if (show && !loadingDiv) {
            const loading = document.createElement('div');
            loading.id = 'loading';
            loading.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 9999;
            `;
            loading.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: 10px; text-align: center;">
                    <div style="font-size: 40px; margin-bottom: 15px;">⏳</div>
                    <p>Processando pagamento...</p>
                </div>
            `;
            document.body.appendChild(loading);
            
        } else if (!show && loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    function mostrarSucesso() {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #d4edda;
            border: 2px solid #c3e6cb;
            color: #155724;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 10000;
            max-width: 500px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;
        successDiv.innerHTML = `
            <div style="font-size: 60px; margin-bottom: 20px;">🎉</div>
            <h3>Pagamento Aprovado!</h3>
            <p style="margin: 20px 0;">
                Sua declaração de amor foi enviada com sucesso!<br>
                Em breve a pessoa especial receberá sua mensagem! 💖
            </p>
            <button onclick="location.reload()" style="background: #28a745; color: white; border: none; padding: 15px 25px; border-radius: 8px; cursor: pointer; font-size: 16px;">
                ✨ Nova Declaração
            </button>
        `;
        document.body.appendChild(successDiv);
    }
    
    function mostrarPendente(resultado) {
        const pendingDiv = document.createElement('div');
        pendingDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fff3cd;
            border: 2px solid #ffeaa7;
            color: #856404;
            padding: 30px;
            border-radius: 15px;
            text-align: center;
            z-index: 10000;
            max-width: 500px;
        `;
        pendingDiv.innerHTML = `
            <div style="font-size: 50px; margin-bottom: 20px;">⏰</div>
            <h3>Pagamento Pendente</h3>
            <p>Seu pagamento está sendo processado. Você receberá uma confirmação em breve.</p>
            <button onclick="this.parentElement.remove()" style="background: #ffc107; color: #212529; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 15px;">
                OK
            </button>
        `;
        document.body.appendChild(pendingDiv);
    }
    
    function mostrarErro(mensagem) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f8d7da;
            border: 2px solid #f5c6cb;
            color: #721c24;
            padding: 20px;
            border-radius: 10px;
            z-index: 10001;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <strong>❌ Erro</strong><br>
            ${mensagem}
            <button onclick="this.parentElement.remove()" style="float: right; background: none; border: none; font-size: 18px; cursor: pointer;">×</button>
        `;
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            if (errorDiv.parentElement) {
                errorDiv.remove();
            }
        }, 8000);
    }
    
    // Event listener para o formulário
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const name = formData.get('name')?.trim();
        const message = formData.get('message')?.trim();
        
        // Validação
        if (!name || !message) {
            mostrarErro('Por favor, preencha todos os campos.');
            return;
        }
        
        if (name.length < 2) {
            mostrarErro('Nome deve ter pelo menos 2 caracteres.');
            return;
        }
        
        if (message.length < 10) {
            mostrarErro('Mensagem deve ter pelo menos 10 caracteres.');
            return;
        }
        
        // Salvar dados e mostrar pagamento
        dadosFormulario = { name, message };
        mostrarPagamento(dadosFormulario);
    });
    
    // Adicionar estilos CSS
    const style = document.createElement('style');
    style.textContent = `
        #payment-brick-container {
            margin: 20px 0;
            min-height: 400px;
        }
        
        .mp-loading {
            display: flex !important;
            justify-content: center;
            align-items: center;
            min-height: 200px;
        }
        
        /* Customização dos elementos do Mercado Pago */
        .mp-form-row {
            margin-bottom: 15px;
        }
        
        .mp-btn-primary {
            background-color: #e91e63 !important;
            border-color: #e91e63 !important;
        }
        
        .mp-btn-primary:hover {
            background-color: #c2185b !important;
            border-color: #c2185b !important;
        }
    `;
    document.head.appendChild(style);
    
    // Inicializar sistema
    if (!inicializarMercadoPago()) {
        console.error('❌ Falha na inicialização do Mercado Pago');
        mostrarErro('Sistema de pagamento indisponível. Verifique sua chave pública.');
    }
    
    console.log('🚀 Sistema de Correio do Amor com Mercado Pago inicializado!');
});

// Função para verificar status do pagamento (webhook simulation)
function verificarStatusPagamento(paymentId) {
    // Esta função seria chamada pelo seu webhook em produção
    console.log('Verificando status do pagamento:', paymentId);
    
    // Simular verificação
    return {
        id: paymentId,
        status: 'approved',
        status_detail: 'accredited'
    };
}

// Debug info
function debugMercadoPago() {
    console.log('🛠️ Debug Mercado Pago:');
    console.log('- Public Key:', MP_PUBLIC_KEY);
    console.log('- Formspree URL:', 'https://formspree.io/f/mpwrwjyz');
    console.log('- Valor do Serviço:', 'R$ 5,00');
    console.log('⚠️ LEMBRE-SE: Configure sua chave pública real!');
}