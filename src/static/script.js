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
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        showNotification('Erro na comunicação com o servidor', 'error');
        throw error;
    }
}

// Dashboard
async function loadDashboardData() {
    try {
        const stats = await apiCall('/dashboard/stats');
        
        document.getElementById('a-receber').textContent = formatCurrency(stats.a_receber);
        document.getElementById('vencido').textContent = formatCurrency(stats.vencido);
        document.getElementById('recebido').textContent = formatCurrency(stats.recebido);
        document.getElementById('cancelado').textContent = formatCurrency(stats.cancelado);

        const tbody = document.getElementById('recent-faturamentos');
        tbody.innerHTML = '';

        if (stats.ultimos_faturamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Nenhum faturamento encontrado</td></tr>';
        } else {
            stats.ultimos_faturamentos.forEach(fat => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${fat.cliente_nome}</td>
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
                <button type="submit" class="btn btn-primary">Salvar</button>
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
            showNotification('Cliente cadastrado com sucesso!', 'success');
            if (currentTab === 'clientes') {
                loadClientes();
            }
        } catch (error) {
            showNotification('Erro ao cadastrar cliente', 'error');
        }
    });
}

function showNovoProdutoModal() {
    if (!currentClient) return;
    
    const content = `
        <form id="produto-form">
            <div class="form-group">
                <label for="nome">Nome do Produto/Serviço</label>
                <input type="text" id="nome" name="nome" required>
            </div>
            <div class="form-group">
                <label for="descricao">Descrição</label>
                <textarea id="descricao" name="descricao"></textarea>
            </div>
            <div class="form-group">
                <label for="valor">Valor</label>
                <input type="number" id="valor" name="valor" step="0.01" required>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    
    showModal('Novo Produto/Serviço', content);
    
    document.getElementById('produto-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        data.valor = parseFloat(data.valor);
        
        try {
            await apiCall(`/clientes/${currentClient.id}/produtos`, 'POST', data);
            closeModal();
            showNotification('Produto/Serviço cadastrado com sucesso!', 'success');
            loadClientDetail(currentClient.id);
        } catch (error) {
            showNotification('Erro ao cadastrar produto/serviço', 'error');
        }
    });
}

function showNovaAnotacaoModal() {
    if (!currentClient) return;
    
    const content = `
        <form id="anotacao-form">
            <div class="form-group">
                <label for="titulo">Título</label>
                <input type="text" id="titulo" name="titulo" required>
            </div>
            <div class="form-group">
                <label for="conteudo">Conteúdo</label>
                <textarea id="conteudo" name="conteudo" required rows="5"></textarea>
            </div>
            <div class="form-actions">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                <button type="submit" class="btn btn-primary">Salvar</button>
            </div>
        </form>
    `;
    
    showModal('Nova Anotação', content);
    
    document.getElementById('anotacao-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = Object.fromEntries(formData);
        
        try {
            await apiCall(`/clientes/${currentClient.id}/anotacoes`, 'POST', data);
            closeModal();
            showNotification('Anotação criada com sucesso!', 'success');
            loadClientDetail(currentClient.id);
        } catch (error) {
            showNotification('Erro ao criar anotação', 'error');
        }
    });
}

async function showNovoFaturamentoModal() {
    try {
        const clientes = await apiCall('/clientes');
        
        const clientesOptions = clientes.map(cliente => 
            `<option value="${cliente.id}">${cliente.nome}</option>`
        ).join('');
        
        const content = `
            <form id="faturamento-form">
                <div class="form-group">
                    <label for="cliente_id">Cliente</label>
                    <select id="cliente_id" name="cliente_id" required>
                        <option value="">Selecione um cliente</option>
                        ${clientesOptions}
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
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        `;
        
        showModal('Novo Faturamento', content);
        
        document.getElementById('faturamento-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            data.valor = parseFloat(data.valor);
            data.cliente_id = parseInt(data.cliente_id);
            
            try {
                await apiCall(`/clientes/${data.cliente_id}/faturamentos`, 'POST', data);
                closeModal();
                showNotification('Faturamento criado com sucesso!', 'success');
                if (currentTab === 'faturamento') {
                    loadFaturamentos();
                }
                if (currentTab === 'dashboard') {
                    loadDashboardData();
                }
            } catch (error) {
                showNotification('Erro ao criar faturamento', 'error');
            }
        });
    } catch (error) {
        showNotification('Erro ao carregar clientes', 'error');
    }
}

// Edit/Delete functions
async function editProduto(id) {
    try {
        const produto = await apiCall(`/produtos/${id}`);
        const content = `
            <form id="edit-produto-form">
                <div class="form-group">
                    <label for="edit_nome_produto">Nome do Produto/Serviço</label>
                    <input type="text" id="edit_nome_produto" name="nome" value="${produto.nome}" required>
                </div>
                <div class="form-group">
                    <label for="edit_descricao_produto">Descrição</label>
                    <textarea id="edit_descricao_produto" name="descricao">${produto.descricao || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit_valor_produto">Valor</label>
                    <input type="number" id="edit_valor_produto" name="valor" step="0.01" value="${produto.valor}" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </div>
            </form>
        `;
        showModal("Editar Produto/Serviço", content);

        document.getElementById("edit-produto-form").addEventListener("submit", async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            data.valor = parseFloat(data.valor);

            try {
                await apiCall(`/produtos/${id}`, "PUT", data);
                closeModal();
                showNotification("Produto/Serviço atualizado com sucesso!", "success");
                loadClientDetail(currentClient.id);
            } catch (error) {
                showNotification("Erro ao atualizar produto/serviço", "error");
            }
        });
    } catch (error) {
        showNotification("Erro ao carregar dados do produto/serviço", "error");
    }
}

async function deleteProduto(id) {
    if (confirm('Tem certeza que deseja excluir este produto/serviço?')) {
        try {
            await apiCall(`/produtos/${id}`, 'DELETE');
            showNotification('Produto/Serviço excluído com sucesso!', 'success');
            loadClientDetail(currentClient.id);
        } catch (error) {
            showNotification('Erro ao excluir produto/serviço', 'error');
        }
    }
}

async function editAnotacao(id) {
    try {
        const anotacao = await apiCall(`/anotacoes/${id}`);
        const content = `
            <form id="edit-anotacao-form">
                <div class="form-group">
                    <label for="edit_titulo_anotacao">Título</label>
                    <input type="text" id="edit_titulo_anotacao" name="titulo" value="${anotacao.titulo}" required>
                </div>
                <div class="form-group">
                    <label for="edit_conteudo_anotacao">Conteúdo</label>
                    <textarea id="edit_conteudo_anotacao" name="conteudo" required rows="5">${anotacao.conteudo}</textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </div>
            </form>
        `;
        showModal("Editar Anotação", content);

        document.getElementById("edit-anotacao-form").addEventListener("submit", async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            try {
                await apiCall(`/anotacoes/${id}`, "PUT", data);
                closeModal();
                showNotification("Anotação atualizada com sucesso!", "success");
                loadClientDetail(currentClient.id);
            } catch (error) {
                showNotification("Erro ao atualizar anotação", "error");
            }
        });
    } catch (error) {
        showNotification("Erro ao carregar dados da anotação", "error");
    }
}

async function deleteAnotacao(id) {
    if (confirm('Tem certeza que deseja excluir esta anotação?')) {
        try {
            await apiCall(`/anotacoes/${id}`, 'DELETE');
            showNotification('Anotação excluída com sucesso!', 'success');
            loadClientDetail(currentClient.id);
        } catch (error) {
            showNotification('Erro ao excluir anotação', 'error');
        }
    }
}

async function editFaturamento(id) {
    try {
        const faturamento = await apiCall(`/faturamentos/${id}`);
        const clientes = await apiCall("/clientes");
        const clientesOptions = clientes.map(cliente => 
            `<option value="${cliente.id}" ${cliente.id === faturamento.cliente_id ? "selected" : ""}>${cliente.nome}</option>`
        ).join("");

        const content = `
            <form id="edit-faturamento-form">
                <div class="form-group">
                    <label for="edit_cliente_id">Cliente</label>
                    <select id="edit_cliente_id" name="cliente_id" required disabled>
                        ${clientesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="edit_descricao_faturamento">Descrição</label>
                    <input type="text" id="edit_descricao_faturamento" name="descricao" value="${faturamento.descricao}" required>
                </div>
                <div class="form-group">
                    <label for="edit_valor_faturamento">Valor</label>
                    <input type="number" id="edit_valor_faturamento" name="valor" step="0.01" value="${faturamento.valor}" required>
                </div>
                <div class="form-group">
                    <label for="edit_data_vencimento_faturamento">Data de Vencimento</label>
                    <input type="date" id="edit_data_vencimento_faturamento" name="data_vencimento" value="${faturamento.data_vencimento}" required>
                </div>
                <div class="form-group">
                    <label for="edit_status_faturamento">Status</label>
                    <select id="edit_status_faturamento" name="status">
                        <option value="pendente" ${faturamento.status === "pendente" ? "selected" : ""}>Pendente</option>
                        <option value="pago" ${faturamento.status === "pago" ? "selected" : ""}>Pago</option>
                        <option value="atrasado" ${faturamento.status === "atrasado" ? "selected" : ""}>Atrasado</option>
                        <option value="cancelado" ${faturamento.status === "cancelado" ? "selected" : ""}>Cancelado</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                </div>
            </form>
        `;
        showModal("Editar Faturamento", content);

        document.getElementById("edit-faturamento-form").addEventListener("submit", async function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            data.valor = parseFloat(data.valor);

            try {
                await apiCall(`/faturamentos/${id}`, "PUT", data);
                closeModal();
                showNotification("Faturamento atualizado com sucesso!", "success");
                if (currentTab === "faturamento") {
                    loadFaturamentos();
                }
                if (currentTab === "dashboard") {
                    loadDashboardData();
                }
                if (currentClient) {
                    loadClientDetail(currentClient.id);
                }
            } catch (error) {
                showNotification("Erro ao atualizar faturamento", "error");
            }
        });
    } catch (error) {
        showNotification("Erro ao carregar dados do faturamento", "error");
    }
}

async function deleteCliente(id) {
    if (confirm('Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.')) {
        try {
            await apiCall(`/clientes/${id}`, 'DELETE');
            showNotification('Cliente excluído com sucesso!', 'success');
            loadClientes();
        } catch (error) {
            showNotification('Erro ao excluir cliente', 'error');
        }
    }
}

async function deleteFaturamento(id) {
    if (confirm('Tem certeza que deseja excluir este faturamento?')) {
        try {
            await apiCall(`/faturamentos/${id}`, 'DELETE');
            showNotification('Faturamento excluído com sucesso!', 'success');
            if (currentTab === 'faturamento') {
                loadFaturamentos();
            }
            if (currentTab === 'dashboard') {
                loadDashboardData();
            }
        } catch (error) {
            showNotification('Erro ao excluir faturamento', 'error');
        }
    }
}

// Utility functions
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value || 0);
}

function formatDate(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
}

function formatDateTime(dateString) {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('pt-BR');
}

function showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 2rem;
        border-radius: 8px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    switch(type) {
        case 'success':
            notification.style.background = '#38a169';
            break;
        case 'error':
            notification.style.background = '#e53e3e';
            break;
        case 'info':
            notification.style.background = '#3182ce';
            break;
    }
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

