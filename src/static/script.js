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
        showNotification('Erro na comunicação com o servidor', 'error');
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

function showNovoClienteModal() {
    const content = `
        <form id="cliente-form">
            <div class="form-group">
                <label for="nome">Nome do Cliente</label>
                <input type="text" id="nome" name="nome" required>
            </div>
            <div class="form-group">
                <label for="contato">Nome do Contato</label>
                <input type="text" id="contato" name="contato" required>
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" name="email" required>
            </div>
            <div class="form-group">
                <label for="telefone">Telefone</label>
                <input type="tel" id="telefone" name="telefone" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar Cliente</button>
            </div>
        </form>
    `;
    
    showModal('Novo Cliente', content);
    
    document.getElementById('cliente-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        try {
            await apiCall('/clientes', 'POST', data);
            closeModal();
            loadClientes();
            showNotification('Cliente criado com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao criar cliente', 'error');
        }
    });
}

function showNovoFaturamentoModal() {
    const content = `
        <form id="faturamento-form">
            <div class="form-group">
                <label for="cliente_id">Cliente</label>
                <select id="cliente_id" name="cliente_id" required>
                    <option value="">Selecione um cliente</option>
                </select>
            </div>
            <div class="form-group">
                <label for="descricao">Descrição</label>
                <input type="text" id="descricao" name="descricao" required>
            </div>
            <div class="form-group">
                <label for="valor">Valor</label>
                <input type="number" id="valor" name="valor" step="0.01" required>
            </div>
            <div class="form-group">
                <label for="data_vencimento">Data de Vencimento</label>
                <input type="date" id="data_vencimento" name="data_vencimento" required>
            </div>
            <div class="form-group">
                <label for="status">Status</label>
                <select id="status" name="status">
                    <option value="pendente">Pendente</option>
                    <option value="pago">Pago</option>
                    <option value="atrasado">Atrasado</option>
                    <option value="cancelado">Cancelado</option>
                </select>
            </div>
            <div class="form-group">
                <label for="tipo">Tipo de Faturamento</label>
                <select id="tipo" name="tipo">
                    <option value="unico">Único</option>
                    <option value="recorrente">Recorrente</option>
                    <option value="personalizado">Personalizado</option>
                </select>
            </div>
            <div class="form-group" id="recorrencia-group" style="display:none;">
                <label for="recorrencia">Recorrência</label>
                <select id="recorrencia" name="recorrencia">
                    <option value="">Selecione</option>
                    <option value="semanal">Semanal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="mensal">Mensal</option>
                    <option value="anual">Anual</option>
                </select>
            </div>
            <div class="form-group" id="parcelas-group" style="display:none;">
                <label for="numero_parcelas">Número de Parcelas</label>
                <input type="number" id="numero_parcelas" name="numero_parcelas" min="1">
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar Faturamento</button>
            </div>
        </form>
    `;
    
    showModal('Novo Faturamento', content);
    
    // Load clients for the select input
    apiCall('/clientes').then(clientes => {
        const select = document.getElementById('cliente_id');
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            select.appendChild(option);
        });
    }).catch(error => {
        console.error('Erro ao carregar clientes para o formulário de faturamento:', error);
        showNotification('Erro ao carregar clientes', 'error');
    });

    // Handle 'tipo' change for recurrence and installments
    document.getElementById('tipo').addEventListener('change', function() {
        const tipo = this.value;
        document.getElementById('recorrencia-group').style.display = tipo === 'recorrente' ? 'block' : 'none';
        document.getElementById('parcelas-group').style.display = tipo === 'personalizado' ? 'block' : 'none';
    });

    document.getElementById('faturamento-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        // Ensure numeric values are parsed correctly
        data.valor = parseFloat(data.valor);
        if (data.numero_parcelas) data.numero_parcelas = parseInt(data.numero_parcelas);
        
        try {
            await apiCall(`/clientes/${data.cliente_id}/faturamentos`, 'POST', data);
            closeModal();
            loadFaturamentos();
            showNotification('Faturamento criado com sucesso!', 'success');
        } catch (error) {
            showNotification(`Erro ao criar faturamento: ${error.message}`, 'error');
        }
    });
}

// Delete functions
async function deleteCliente(id) {
    if (confirm('Tem certeza que deseja excluir este cliente e todos os seus dados relacionados?')) {
        try {
            await apiCall(`/clientes/${id}`, 'DELETE');
            loadClientes();
            showNotification('Cliente excluído com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao excluir cliente', 'error');
        }
    }
}

async function deleteProduto(id) {
    if (confirm('Tem certeza que deseja excluir este produto/serviço?')) {
        try {
            await apiCall(`/produtos/${id}`, 'DELETE');
            loadClientDetail(currentClient.id); // Reload client detail to update product list
            showNotification('Produto/Serviço excluído com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao excluir produto/serviço', 'error');
        }
    }
}

async function deleteAnotacao(id) {
    if (confirm('Tem certeza que deseja excluir esta anotação?')) {
        try {
            await apiCall(`/anotacoes/${id}`, 'DELETE');
            loadClientDetail(currentClient.id); // Reload client detail to update annotation list
            showNotification('Anotação excluída com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao excluir anotação', 'error');
        }
    }
}

async function deleteFaturamento(id) {
    if (confirm('Tem certeza que deseja excluir este faturamento?')) {
        try {
            await apiCall(`/faturamentos/${id}`, 'DELETE');
            loadFaturamentos(); // Reload main faturamentos list
            if (currentClient) {
                loadClientDetail(currentClient.id); // Reload client detail if open
            }
            showNotification('Faturamento excluído com sucesso!', 'success');
        } catch (error) {
            showNotification('Erro ao excluir faturamento', 'error');
        }
    }
}

// Helper functions
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString + 'T00:00:00'); // Add T00:00:00 to avoid timezone issues
    return date.toLocaleDateString('pt-BR');
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '-';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
}

function showNotification(message, type) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    setTimeout(() => {
        notification.className = 'notification';
    }, 3000);
}

// Edit functions (placeholders)
function editProduto(id) {
    showNotification("Funcionalidade de edição em desenvolvimento", "info");
}

function editAnotacao(id) {
    showNotification("Funcionalidade de edição em desenvolvimento", "info");
}

function editFaturamento(id) {
    showNotification("Funcionalidade de edição em desenvolvimento", "info");
}