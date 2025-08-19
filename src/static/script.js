// Estado da aplicação
let currentTab = 'dashboard';
let currentClient = null;
let currentDetailTab = 'info';

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupEventListeners();
    loadDashboardData();
}

function setupEventListeners() {
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Detail tabs
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            switchDetailTab(this.dataset.detailTab);
        });
    });

    // Modal
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) closeModal();
    });

    // Buttons
    document.getElementById('novo-cliente-btn').addEventListener('click', showNovoClienteModal);
    document.getElementById('novo-faturamento-btn').addEventListener('click', showNovoFaturamentoModal);
    document.getElementById('voltar-clientes').addEventListener('click', () => switchTab('clientes'));
    document.getElementById('novo-produto-btn').addEventListener('click', showNovoProdutoModal);
    document.getElementById('nova-anotacao-btn').addEventListener('click', showNovaAnotacaoModal);
}

// Navigation
function switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    currentTab = tabName;

    // Load data based on tab
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'clientes':
            loadClientes();
            break;
        case 'faturamento':
            loadFaturamentos();
            break;
    }
}

function switchDetailTab(tabName) {
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-detail-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.detail-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-content`).classList.add('active');

    currentDetailTab = tabName;

    if (currentClient) {
        loadClientDetail(currentClient.id);
    }
}

// API calls
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
        }
    };

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`/api${endpoint}`, options);
        
        // Verificar se a resposta é bem-sucedida
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Server error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        // Verificar se a resposta é JSON antes de tentar parsear
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        } else {
            // Se não for JSON, retornar o texto puro ou um objeto vazio
            const text = await response.text();
            console.warn('Received non-JSON response:', text);
            return {}; // Ou null, dependendo do que a função espera
        }
    } catch (error) {
        console.error('API call failed:', error);
        alert('Erro na comunicação com o servidor'); // Usando alert para evitar dependência de showNotification
        throw error;
    }
}

// Dashboard
let currentDashboardMonth = new Date().getMonth() + 1;
let currentDashboardYear = new Date().getFullYear();

async function loadDashboardData() {
    try {
        const stats = await apiCall(`/resumo-mensal?mes=${currentDashboardMonth}&ano=${currentDashboardYear}`);
        
        // Atualizar título do mês
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                           'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        document.getElementById('dashboard-month-title').textContent = 
            `${monthNames[currentDashboardMonth - 1]} ${currentDashboardYear}`;
        
        document.getElementById('a-receber').textContent = formatCurrency(stats.total_pendente || 0);
        document.getElementById('vencido').textContent = formatCurrency(stats.total_vencido || 0);
        document.getElementById('recebido').textContent = formatCurrency(stats.total_recebido || 0);
        document.getElementById('cancelado').textContent = formatCurrency(stats.total_cancelado || 0);

        // Carregar faturamentos recentes do mês atual
        const faturamentos = await apiCall(`/faturamentos?mes=${currentDashboardMonth}&ano=${currentDashboardYear}`);
        const tbody = document.getElementById('recent-faturamentos');
        tbody.innerHTML = '';

        if (faturamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum faturamento encontrado para este mês</td></tr>';
        } else {
            faturamentos.slice(0, 10).forEach(fat => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${fat.cliente_nome || 'Cliente não encontrado'}</td>
                    <td>${fat.descricao}</td>
                    <td>${formatCurrency(fat.valor)}</td>
                    <td>${formatDate(fat.data_vencimento)}</td>
                    <td><span class="status-badge status-${fat.status}">${fat.status}</span></td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
    }
}

function previousMonth() {
    currentDashboardMonth--;
    if (currentDashboardMonth < 1) {
        currentDashboardMonth = 12;
        currentDashboardYear--;
    }
    loadDashboardData();
}

function nextMonth() {
    currentDashboardMonth++;
    if (currentDashboardMonth > 12) {
        currentDashboardMonth = 1;
        currentDashboardYear++;
    }
    loadDashboardData();
}

// Clientes
async function loadClientes() {
    try {
        const clientes = await apiCall('/clientes');
        const grid = document.getElementById('clientes-grid');
        grid.innerHTML = '';

        if (clientes.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>Nenhum cliente cadastrado</h3>
                    <p>Clique em "Novo Cliente" para começar</p>
                </div>
            `;
        } else {
            clientes.forEach(cliente => {
                const card = document.createElement('div');
                card.className = 'cliente-card';
                card.innerHTML = `
                    <div class="cliente-header">
                        <h3>${cliente.nome}</h3>
                        <button class="btn-icon btn-delete" onclick="deleteCliente(${cliente.id})" title="Excluir Cliente">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                    <div class="cliente-info">
                        <span><i class="fas fa-user"></i> ${cliente.contato}</span>
                        <span><i class="fas fa-envelope"></i> ${cliente.email}</span>
                        <span><i class="fas fa-phone"></i> ${cliente.telefone}</span>
                    </div>
                `;
                card.addEventListener('click', (e) => {
                    // Não abrir detalhes se clicou no botão de excluir
                    if (!e.target.closest('.btn-delete')) {
                        showClientDetail(cliente);
                    }
                });
                grid.appendChild(card);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
    }
}

async function showClientDetail(cliente) {
    currentClient = cliente;
    
    document.getElementById('cliente-nome').textContent = cliente.nome;
    document.getElementById('cliente-info').textContent = `${cliente.email} • ${cliente.telefone}`;
    
    // Reset to info tab
    switchDetailTab('info');
    
    // Show detail view
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById('cliente-detail').classList.add('active');
    
    await loadClientDetail(cliente.id);
}

async function loadClientDetail(clienteId) {
    try {
        const cliente = await apiCall(`/clientes/${clienteId}`);
        
        // Update info
        document.getElementById('info-nome').textContent = cliente.nome;
        document.getElementById('info-contato').textContent = cliente.contato;
        document.getElementById('info-email').textContent = cliente.email;
        document.getElementById('info-telefone').textContent = cliente.telefone;
        
        // Load produtos
        loadProdutos(cliente.produtos || []);
        
        // Load anotações
        loadAnotacoes(cliente.anotacoes || []);
        
        // Load histórico
        loadHistoricoFaturamento(cliente.faturamentos || []);
        
    } catch (error) {
        console.error('Erro ao carregar detalhes do cliente:', error);
    }
}

function loadProdutos(produtos) {
    const list = document.getElementById('produtos-list');
    list.innerHTML = '';
    
    if (produtos.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box"></i>
                <h3>Nenhum produto/serviço cadastrado</h3>
                <p>Clique em "Adicionar" para começar</p>
            </div>
        `;
    } else {
        produtos.forEach(produto => {
            const item = document.createElement('div');
            item.className = 'produto-item';
            item.innerHTML = `
                <div class="produto-info">
                    <h4>${produto.nome}</h4>
                    <p>${produto.descricao || 'Sem descrição'}</p>
                    <div class="produto-valor">${formatCurrency(produto.valor)}</div>
                </div>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" onclick="editProduto(${produto.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteProduto(${produto.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    }
}

function loadAnotacoes(anotacoes) {
    const list = document.getElementById('anotacoes-list');
    list.innerHTML = '';
    
    if (anotacoes.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <h3>Nenhuma anotação encontrada</h3>
                <p>Clique em "Nova Anotação" para começar</p>
            </div>
        `;
    } else {
        // Ordenar por data mais recente
        anotacoes.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
        
        anotacoes.forEach(anotacao => {
            const item = document.createElement('div');
            item.className = 'anotacao-item';
            item.innerHTML = `
                <div class="anotacao-header">
                    <h4>${anotacao.titulo}</h4>
                    <div class="anotacao-data">${formatDateTime(anotacao.data_criacao)}</div>
                </div>
                <div class="anotacao-conteudo">${anotacao.conteudo}</div>
                <div class="action-buttons" style="margin-top: 1rem;">
                    <button class="btn-icon btn-edit" onclick="editAnotacao(${anotacao.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon btn-delete" onclick="deleteAnotacao(${anotacao.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            list.appendChild(item);
        });
    }
}

function loadHistoricoFaturamento(faturamentos) {
    const tbody = document.getElementById('historico-faturamentos');
    tbody.innerHTML = '';
    
    if (faturamentos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum faturamento encontrado</td></tr>';
    } else {
        // Ordenar por data de criação mais recente
        faturamentos.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
        
        faturamentos.forEach(fat => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fat.descricao}</td>
                <td>${formatCurrency(fat.valor)}</td>
                <td>${formatDate(fat.data_vencimento)}</td>
                <td>${fat.data_pagamento ? formatDate(fat.data_pagamento) : '-'}</td>
                <td><span class="status-badge status-${fat.status}">${fat.status}</span></td>
            `;
            tbody.appendChild(row);
        });
    }
}

// Faturamentos
async function loadFaturamentos() {
    try {
        const clientes = await apiCall('/clientes');
        const tbody = document.getElementById('faturamentos-table');
        tbody.innerHTML = '';
        
        let allFaturamentos = [];
        
        // Collect all faturamentos from all clients
        for (const cliente of clientes) {
            const clienteDetail = await apiCall(`/clientes/${cliente.id}`);
            if (clienteDetail.faturamentos) {
                clienteDetail.faturamentos.forEach(fat => {
                    fat.cliente_nome = cliente.nome;
                    allFaturamentos.push(fat);
                });
            }
        }
        
        if (allFaturamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum faturamento encontrado</td></tr>';
        } else {
            // Sort by creation date
            allFaturamentos.sort((a, b) => new Date(b.data_criacao) - new Date(a.data_criacao));
            
            allFaturamentos.forEach(fat => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${fat.cliente_nome}</td>
                    <td>${fat.descricao}</td>
                    <td>${formatCurrency(fat.valor)}</td>
                    <td>${formatDate(fat.data_vencimento)}</td>
                    <td><span class="status-badge status-${fat.status}">${fat.status}</span></td>
                    <td>
                        <div class="action-buttons">
                            <button class="btn-icon btn-edit" onclick="editFaturamento(${fat.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-icon btn-delete" onclick="deleteFaturamento(${fat.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar faturamentos:', error);
    }
}

// Modals
function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// Helper functions
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR', options);
}

function formatDateTime(dateString) {
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification ${type} active`;
        setTimeout(() => {
            notification.classList.remove('active');
        }, 3000);
    } else {
        console.warn('Elemento de notificação não encontrado. Mensagem:', message);
    }
}

// Funções de CRUD para Modals (Adicionar/Editar/Excluir)

// Cliente
async function showNovoClienteModal() {
    const content = `
        <form id="novo-cliente-form">
            <div class="form-group">
                <label for="nome">Nome</label>
                <input type="text" id="nome" required>
            </div>
            <div class="form-group">
                <label for="contato">Contato</label>
                <input type="text" id="contato">
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email">
            </div>
            <div class="form-group">
                <label for="telefone">Telefone</label>
                <input type="text" id="telefone">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    showModal('Novo Cliente', content);

    document.getElementById('novo-cliente-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = {
            nome: document.getElementById('nome').value,
            contato: document.getElementById('contato').value,
            email: document.getElementById('email').value,
            telefone: document.getElementById('telefone').value
        };
        try {
            await apiCall('/clientes', 'POST', data);
            closeModal();
            showNotification('Cliente adicionado com sucesso!', 'success');
            loadClientes();
        } catch (error) {
            showNotification('Erro ao adicionar cliente', 'error');
        }
    });
}

async function showEditClienteModal(clienteId) {
    try {
        const cliente = await apiCall(`/clientes/${clienteId}`);
        const content = `
            <form id="edit-cliente-form">
                <div class="form-group">
                    <label for="edit-nome">Nome</label>
                    <input type="text" id="edit-nome" value="${cliente.nome}" required>
                </div>
                <div class="form-group">
                    <label for="edit-contato">Contato</label>
                    <input type="text" id="edit-contato" value="${cliente.contato || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-email">Email</label>
                    <input type="email" id="edit-email" value="${cliente.email || ''}">
                </div>
                <div class="form-group">
                    <label for="edit-telefone">Telefone</label>
                    <input type="text" id="edit-telefone" value="${cliente.telefone || ''}">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        `;
        showModal('Editar Cliente', content);

        document.getElementById('edit-cliente-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = {
                nome: document.getElementById('edit-nome').value,
                contato: document.getElementById('edit-contato').value,
                email: document.getElementById('edit-email').value,
                telefone: document.getElementById('edit-telefone').value
            };
            try {
                await apiCall(`/clientes/${clienteId}`, 'PUT', data);
                closeModal();
                showNotification('Cliente atualizado com sucesso!', 'success');
                loadClientes();
                if (currentClient && currentClient.id === clienteId) {
                    loadClientDetail(clienteId);
                }
            } catch (error) {
                showNotification('Erro ao atualizar cliente', 'error');
            }
        });
    } catch (error) {
        console.error('Erro ao carregar dados do cliente para edição:', error);
        showNotification('Erro ao carregar dados do cliente para edição', 'error');
    }
}

async function deleteCliente(clienteId) {
    if (confirm('Tem certeza que deseja excluir este cliente e todos os seus dados relacionados?')) {
        try {
            await apiCall(`/clientes/${clienteId}`, 'DELETE');
            showNotification('Cliente excluído com sucesso!', 'success');
            loadClientes();
            if (currentClient && currentClient.id === clienteId) {
                switchTab('clientes'); // Voltar para a lista de clientes se o cliente atual for excluído
            }
        } catch (error) {
            showNotification('Erro ao excluir cliente', 'error');
        }
    }
}

// Faturamento
async function showNovoFaturamentoModal() {
    try {
        const clientes = await apiCall('/clientes');
        let clienteOptions = '';
        clientes.forEach(cliente => {
            clienteOptions += `<option value="${cliente.id}">${cliente.nome}</option>`;
        });

        const content = `
            <form id="novo-faturamento-form">
                <div class="form-group">
                    <label for="faturamento-cliente">Cliente</label>
                    <select id="faturamento-cliente" required>
                        ${clienteOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="faturamento-descricao">Descrição</label>
                    <input type="text" id="faturamento-descricao" required>
                </div>
                <div class="form-group">
                    <label for="faturamento-valor">Valor</label>
                    <input type="number" id="faturamento-valor" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="faturamento-data-vencimento">Data de Vencimento</label>
                    <input type="date" id="faturamento-data-vencimento" required>
                </div>
                <div class="form-group">
                    <label for="faturamento-status">Status</label>
                    <select id="faturamento-status" required>
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="atrasado">Atrasado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        `;
        showModal('Novo Faturamento', content);

        document.getElementById('novo-faturamento-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = {
                cliente_id: document.getElementById('faturamento-cliente').value,
                descricao: document.getElementById('faturamento-descricao').value,
                valor: parseFloat(document.getElementById('faturamento-valor').value),
                data_vencimento: document.getElementById('faturamento-data-vencimento').value,
                status: document.getElementById('faturamento-status').value
            };
            try {
                await apiCall(`/clientes/${data.cliente_id}/faturamentos`, 'POST', data);
                closeModal();
                showNotification('Faturamento adicionado com sucesso!', 'success');
                loadFaturamentos();
                if (currentClient && currentClient.id == data.cliente_id) {
                    loadClientDetail(currentClient.id);
                }
            } catch (error) {
                showNotification('Erro ao adicionar faturamento', 'error');
            }
        });
    } catch (error) {
        console.error('Erro ao carregar dados para novo faturamento:', error);
        showNotification('Erro ao carregar dados para novo faturamento', 'error');
    }
}

async function editFaturamento(faturamentoId) {
    try {
        const faturamento = await apiCall(`/faturamentos/${faturamentoId}`);
        
        const content = `
            <form id="edit-faturamento-form">
                <div class="form-group">
                    <label for="edit-faturamento-descricao">Descrição</label>
                    <input type="text" id="edit-faturamento-descricao" value="${faturamento.descricao}" required>
                </div>
                <div class="form-group">
                    <label for="edit-faturamento-valor">Valor</label>
                    <input type="number" id="edit-faturamento-valor" step="0.01" value="${faturamento.valor}" required>
                </div>
                <div class="form-group">
                    <label for="edit-faturamento-vencimento">Data de Vencimento</label>
                    <input type="date" id="edit-faturamento-vencimento" value="${faturamento.data_vencimento}" required>
                </div>
                <div class="form-group">
                    <label for="edit-faturamento-status">Status</label>
                    <select id="edit-faturamento-status" required>
                        <option value="pendente" ${faturamento.status === 'pendente' ? 'selected' : ''}>Pendente</option>
                        <option value="pago" ${faturamento.status === 'pago' ? 'selected' : ''}>Pago</option>
                        <option value="atrasado" ${faturamento.status === 'atrasado' ? 'selected' : ''}>Atrasado</option>
                        <option value="cancelado" ${faturamento.status === 'cancelado' ? 'selected' : ''}>Cancelado</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        `;
        
        showModal('Editar Faturamento', content);
        
        document.getElementById('edit-faturamento-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const data = {
                descricao: document.getElementById('edit-faturamento-descricao').value,
                valor: parseFloat(document.getElementById('edit-faturamento-valor').value),
                data_vencimento: document.getElementById('edit-faturamento-vencimento').value,
                status: document.getElementById('edit-faturamento-status').value
            };
            
            try {
                await apiCall(`/faturamentos/${faturamentoId}`, 'PUT', data);
                closeModal();
                showNotification('Faturamento atualizado com sucesso!', 'success');
                
                // Recarregar dados dependendo da aba atual
                if (currentTab === 'faturamento') {
                    loadFaturamentos();
                } else if (currentClient) {
                    loadClientDetail(currentClient.id);
                }
            } catch (error) {
                showNotification('Erro ao atualizar faturamento', 'error');
            }
        });
        
    } catch (error) {
        showNotification('Erro ao carregar dados do faturamento', 'error');
    }
}

async function deleteFaturamento(faturamentoId) {
    if (confirm('Tem certeza que deseja excluir este faturamento?')) {
        try {
            await apiCall(`/faturamentos/${faturamentoId}`, 'DELETE');
            showNotification('Faturamento excluído com sucesso!', 'success');
            loadFaturamentos();
            if (currentClient) {
                loadClientDetail(currentClient.id);
            }
        } catch (error) {
            showNotification('Erro ao excluir faturamento', 'error');
        }
    }
}

// Produtos/Serviços
async function showNovoProdutoModal() {
    if (!currentClient) {
        showNotification('Selecione um cliente primeiro para adicionar um produto/serviço.', 'info');
        return;
    }
    const content = `
        <form id="novo-produto-form">
            <div class="form-group">
                <label for="produto-nome">Nome do Produto/Serviço</label>
                <input type="text" id="produto-nome" required>
            </div>
            <div class="form-group">
                <label for="produto-descricao">Descrição</label>
                <textarea id="produto-descricao" rows="3"></textarea>
            </div>
            <div class="form-group">
                <label for="produto-valor">Valor</label>
                <input type="number" id="produto-valor" step="0.01" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    showModal('Novo Produto/Serviço', content);

    document.getElementById('novo-produto-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = {
            nome: document.getElementById('produto-nome').value,
            descricao: document.getElementById('produto-descricao').value,
            valor: parseFloat(document.getElementById('produto-valor').value)
        };
        try {
            await apiCall(`/clientes/${currentClient.id}/produtos`, 'POST', data);
            closeModal();
            showNotification('Produto/Serviço adicionado com sucesso!', 'success');
            loadClientDetail(currentClient.id);
        } catch (error) {
            showNotification('Erro ao adicionar produto/serviço', 'error');
        }
    });
}

async function editProduto(produtoId) {
    try {
        const produto = await apiCall(`/produtos/${produtoId}`);
        
        const content = `
            <form id="edit-produto-form">
                <div class="form-group">
                    <label for="edit-produto-nome">Nome do Produto/Serviço</label>
                    <input type="text" id="edit-produto-nome" value="${produto.nome}" required>
                </div>
                <div class="form-group">
                    <label for="edit-produto-descricao">Descrição</label>
                    <textarea id="edit-produto-descricao" rows="3">${produto.descricao || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-produto-valor">Valor</label>
                    <input type="number" id="edit-produto-valor" step="0.01" value="${produto.valor}" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        `;
        
        showModal('Editar Produto/Serviço', content);
        
        document.getElementById('edit-produto-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const data = {
                nome: document.getElementById('edit-produto-nome').value,
                descricao: document.getElementById('edit-produto-descricao').value,
                valor: parseFloat(document.getElementById('edit-produto-valor').value)
            };
            
            try {
                await apiCall(`/produtos/${produtoId}`, 'PUT', data);
                closeModal();
                showNotification('Produto/Serviço atualizado com sucesso!', 'success');
                // Recarregar os detalhes do cliente para atualizar a lista
                loadClientDetail(currentClient.id);
            } catch (error) {
                showNotification('Erro ao atualizar produto/serviço', 'error');
            }
        });
        
    } catch (error) {
        showNotification('Erro ao carregar dados do produto/serviço', 'error');
    }
}

async function deleteProduto(produtoId) {
    if (confirm('Tem certeza que deseja excluir este produto/serviço?')) {
        try {
            await apiCall(`/produtos/${produtoId}`, 'DELETE');
            showNotification('Produto/Serviço excluído com sucesso!', 'success');
            loadClientDetail(currentClient.id);
        } catch (error) {
            showNotification('Erro ao excluir produto/serviço', 'error');
        }
    }
}

// Anotações
async function showNovaAnotacaoModal() {
    if (!currentClient) {
        showNotification('Selecione um cliente primeiro para adicionar uma anotação.', 'info');
        return;
    }
    const content = `
        <form id="nova-anotacao-form">
            <div class="form-group">
                <label for="anotacao-titulo">Título</label>
                <input type="text" id="anotacao-titulo" required>
            </div>
            <div class="form-group">
                <label for="anotacao-conteudo">Conteúdo</label>
                <textarea id="anotacao-conteudo" rows="5"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    showModal('Nova Anotação', content);

    document.getElementById('nova-anotacao-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = {
            titulo: document.getElementById('anotacao-titulo').value,
            conteudo: document.getElementById('anotacao-conteudo').value
        };
        try {
            await apiCall(`/clientes/${currentClient.id}/anotacoes`, 'POST', data);
            closeModal();
            showNotification('Anotação adicionada com sucesso!', 'success');
            loadClientDetail(currentClient.id);
        } catch (error) {
            showNotification('Erro ao adicionar anotação', 'error');
        }
    });
}

async function editAnotacao(anotacaoId) {
    try {
        const anotacao = await apiCall(`/anotacoes/${anotacaoId}`);
        
        const content = `
            <form id="edit-anotacao-form">
                <div class="form-group">
                    <label for="edit-anotacao-titulo">Título</label>
                    <input type="text" id="edit-anotacao-titulo" value="${anotacao.titulo}" required>
                </div>
                <div class="form-group">
                    <label for="edit-anotacao-conteudo">Conteúdo</label>
                    <textarea id="edit-anotacao-conteudo" rows="5" required>${anotacao.conteudo}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        `;
        
        showModal('Editar Anotação', content);
        
        document.getElementById('edit-anotacao-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const data = {
                titulo: document.getElementById('edit-anotacao-titulo').value,
                conteudo: document.getElementById('edit-anotacao-conteudo').value
            };
            
            try {
                await apiCall(`/anotacoes/${anotacaoId}`, 'PUT', data);
                closeModal();
                showNotification('Anotação atualizada com sucesso!', 'success');
                // Recarregar os detalhes do cliente para atualizar a lista
                loadClientDetail(currentClient.id);
            } catch (error) {
                showNotification('Erro ao atualizar anotação', 'error');
            }
        });
        
    } catch (error) {
        showNotification('Erro ao carregar dados da anotação', 'error');
    }
}

async function deleteAnotacao(anotacaoId) {
    if (confirm('Tem certeza que deseja excluir esta anotação?')) {
        try {
            await apiCall(`/anotacoes/${anotacaoId}`, 'DELETE');
            showNotification('Anotação excluída com sucesso!', 'success');
            loadClientDetail(currentClient.id);
        } catch (error) {
            showNotification('Erro ao excluir anotação', 'error');
        }
    }
}
