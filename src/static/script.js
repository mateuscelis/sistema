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
    document.getElementById('novo-produto-btn').addEventListener('click', showNovoProdutoModal);
    document.getElementById('nova-anotacao-btn').addEventListener('click', showNovaAnotacaoModal);
}

// Funções de Utilidade
async function apiCall(url, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
        };
        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const errorBody = await response.json();
                errorMessage += `, message: ${JSON.stringify(errorBody)}`;
            } catch (e) {
                errorMessage += `, body: ${await response.text()}`; // Handle non-JSON error responses
            }
            throw new Error(errorMessage);
        }

        // Handle empty or non-JSON responses gracefully
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
            return await response.json();
        } else if (response.status === 204) { // No Content
            return {};
        } else {
            return await response.text(); // Return as text if not JSON
        }
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
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
        alert(message); // Fallback to alert if notification element is missing
    }
}

function openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.nav-tab[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    if (tabName === 'dashboard') {
        loadDashboardData();
    } else if (tabName === 'clientes') {
        loadClientes();
    } else if (tabName === 'faturamento') {
        loadFaturamentos();
    }
}

function switchDetailTab(detailTabName) {
    currentDetailTab = detailTabName;
    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`.detail-tab[data-detail-tab="${detailTabName}"]`).classList.add('active');

    document.querySelectorAll('.detail-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`client-${detailTabName}`).classList.add('active');
}

// Funções de Carregamento de Dados
async function loadDashboardData() {
    try {
        const stats = await apiCall('/dashboard/stats');
        document.getElementById('a-receber').textContent = formatCurrency(stats.a_receber);
        document.getElementById('vencido').textContent = formatCurrency(stats.vencido);
        document.getElementById('recebido').textContent = formatCurrency(stats.recebido);
        document.getElementById('cancelado').textContent = formatCurrency(stats.cancelado);

        const recentFatuBody = document.getElementById('recent-fatu-body');
        recentFatuBody.innerHTML = '';
        stats.ultimos_faturamentos.forEach(faturamento => {
            const row = recentFatuBody.insertRow();
            row.insertCell(0).textContent = faturamento.cliente_nome;
            row.insertCell(1).textContent = faturamento.descricao;
            row.insertCell(2).textContent = formatCurrency(faturamento.valor);
            row.insertCell(3).textContent = formatDate(faturamento.data_vencimento);
            row.insertCell(4).innerHTML = `<span class="status-badge status-${faturamento.status}">${faturamento.status.toUpperCase()}</span>`;
        });

        // Load monthly summary for current month
        const today = new Date();
        loadMonthlySummary(today.getMonth() + 1, today.getFullYear());

    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        showNotification('Erro ao carregar dashboard', 'error');
    }
}

async function loadMonthlySummary(month, year) {
    try {
        const resumo = await apiCall(`/resumo-mensal?mes=${month}&ano=${year}`);
        document.getElementById('dashboard-month-title').textContent = `${getMonthName(month)} ${year}`;
        document.getElementById('a-receber-mensal').textContent = formatCurrency(resumo.total_pendente);
        document.getElementById('vencido-mensal').textContent = formatCurrency(resumo.total_vencido);
        document.getElementById('recebido-mensal').textContent = formatCurrency(resumo.total_recebido);
        document.getElementById('cancelado-mensal').textContent = formatCurrency(resumo.total_cancelado);
    } catch (error) {
        console.error('Erro ao carregar resumo mensal:', error);
        showNotification('Erro ao carregar resumo mensal', 'error');
    }
}

function previousMonth() {
    const currentMonthTitle = document.getElementById('dashboard-month-title').textContent;
    const [monthName, yearStr] = currentMonthTitle.split(' ');
    let month = getMonthNumber(monthName);
    let year = parseInt(yearStr);

    month--;
    if (month < 1) {
        month = 12;
        year--;
    }
    loadMonthlySummary(month, year);
}

function nextMonth() {
    const currentMonthTitle = document.getElementById('dashboard-month-title').textContent;
    const [monthName, yearStr] = currentMonthTitle.split(' ');
    let month = getMonthNumber(monthName);
    let year = parseInt(yearStr);

    month++;
    if (month > 12) {
        month = 1;
        year++;
    }
    loadMonthlySummary(month, year);
}

async function loadClientes() {
    try {
        const clientes = await apiCall('/clientes');
        const clientesGrid = document.getElementById('clientes-grid');
        clientesGrid.innerHTML = '';
        clientes.forEach(cliente => {
            const clienteCard = document.createElement('div');
            clienteCard.className = 'cliente-card';
            clienteCard.innerHTML = `
                <h3>${cliente.nome}</h3>
                <p>Contato: ${cliente.contato}</p>
                <p>Email: ${cliente.email}</p>
                <p>Telefone: ${cliente.telefone}</p>
                <div class="cliente-actions">
                    <button class="btn btn-primary" onclick="loadClientDetail(${cliente.id})">Ver Detalhes</button>
                    <button class="btn btn-edit" onclick="showEditClienteModal(${cliente.id})"><i class="fas fa-edit"></i></button>
                    <button class="btn btn-delete" onclick="deleteCliente(${cliente.id})"><i class="fas fa-trash"></i></button>
                </div>
            `;
            clientesGrid.appendChild(clienteCard);
        });
    } catch (error) {
        console.error('Erro ao carregar clientes:', error);
        showNotification('Erro ao carregar clientes', 'error');
    }
}

// Dashboard - VERSÃO CORRIGIDA
async function loadDashboardData() {
    try {
        const stats = await apiCall(`/resumo-mensal?mes=${currentDashboardMonth}&ano=${currentDashboardYear}`);
        
        // Verificar se os elementos existem antes de modificá-los
        const aReceberEl = document.getElementById('a-receber');
        const vencidoEl = document.getElementById('vencido');
        const recebidoEl = document.getElementById('recebido');
        const canceladoEl = document.getElementById('cancelado');
        
        if (aReceberEl) aReceberEl.textContent = formatCurrency(stats.total_pendente || 0);
        if (vencidoEl) vencidoEl.textContent = formatCurrency(stats.total_vencido || 0);
        if (recebidoEl) recebidoEl.textContent = formatCurrency(stats.total_recebido || 0);
        if (canceladoEl) canceladoEl.textContent = formatCurrency(stats.total_cancelado || 0);

        // Atualizar título do mês
        const titleEl = document.getElementById('dashboard-month-title');
        if (titleEl) {
            const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                               'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
            titleEl.textContent = `${monthNames[currentDashboardMonth - 1]} ${currentDashboardYear}`;
        }
        
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        alert('Erro ao carregar dados do dashboard');
    }
}

// Faturamentos - VERSÃO CORRIGIDA
async function loadFaturamentos() {
    try {
        const faturamentos = await apiCall('/faturamentos');
        const tbody = document.getElementById('faturamentos-tbody');
        
        if (!tbody) {
            console.error('Elemento faturamentos-tbody não encontrado');
            return;
        }
        
        tbody.innerHTML = '';

        if (faturamentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhum faturamento encontrado</td></tr>';
        } else {
            faturamentos.forEach(fat => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${fat.cliente_nome || 'Cliente não encontrado'}</td>
                    <td>${fat.descricao}</td>
                    <td>${formatCurrency(fat.valor)}</td>
                    <td>${formatDate(fat.data_vencimento)}</td>
                    <td><span class="status-badge status-${fat.status}">${fat.status}</span></td>
                    <td>
                        <button class="btn-icon btn-edit" onclick="editFaturamento(${fat.id})" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon btn-delete" onclick="deleteFaturamento(${fat.id})" title="Excluir">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });
        }
    } catch (error) {
        console.error('Erro ao carregar faturamentos:', error);
        alert('Erro ao carregar faturamentos');
    }
}


// Funções de Modal e Formulário
function showNovoClienteModal() {
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
            <button type="submit" class="btn btn-primary">Salvar Cliente</button>
        </form>
    `;
    openModal('Novo Cliente', content);

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

async function showEditClienteModal(clientId) {
    try {
        const cliente = await apiCall(`/clientes/${clientId}`);
        const content = `
            <form id="edit-cliente-form">
                <div class="form-group">
                    <label for="edit-nome">Nome</label>
                    <input type="text" id="edit-nome" value="${cliente.nome}" required>
                </div>
                <div class="form-group">
                    <label for="edit-contato">Contato</label>
                    <input type="text" id="edit-contato" value="${cliente.contato}">
                </div>
                <div class="form-group">
                    <label for="edit-email">Email</label>
                    <input type="email" id="edit-email" value="${cliente.email}">
                </div>
                <div class="form-group">
                    <label for="edit-telefone">Telefone</label>
                    <input type="text" id="edit-telefone" value="${cliente.telefone}">
                </div>
                <button type="submit" class="btn btn-primary">Salvar Alterações</button>
            </form>
        `;
        openModal('Editar Cliente', content);

        document.getElementById('edit-cliente-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const data = {
                nome: document.getElementById('edit-nome').value,
                contato: document.getElementById('edit-contato').value,
                email: document.getElementById('edit-email').value,
                telefone: document.getElementById('edit-telefone').value
            };
            try {
                await apiCall(`/clientes/${clientId}`, 'PUT', data);
                closeModal();
                showNotification('Cliente atualizado com sucesso!', 'success');
                loadClientes();
                loadClientDetail(clientId); // Update client detail view if open
            } catch (error) {
                showNotification('Erro ao atualizar cliente', 'error');
            }
        });

    } catch (error) {
        showNotification('Erro ao carregar dados do cliente', 'error');
    }
}

async function deleteCliente(clientId) {
    if (confirm('Tem certeza que deseja excluir este cliente?')) {
        try {
            await apiCall(`/clientes/${clientId}`, 'DELETE');
            showNotification('Cliente excluído com sucesso!', 'success');
            loadClientes();
            // If client detail is open for this client, close it
            if (currentClient && currentClient.id === clientId) {
                document.getElementById('client-detail-section').classList.remove('active');
                document.getElementById('clientes-section').classList.add('active');
            }
        } catch (error) {
            showNotification('Erro ao excluir cliente', 'error');
        }
    }
}

async function showNovoFaturamentoModal() {
    try {
        const clientes = await apiCall('/clientes');
        let clientesOptions = '';
        clientes.forEach(cliente => {
            clientesOptions += `<option value="${cliente.id}">${cliente.nome}</option>`;
        });

        const content = `
            <form id="novo-faturamento-form">
                <div class="form-group">
                    <label for="cliente-id">Cliente</label>
                    <select id="cliente-id" required>
                        ${clientesOptions}
                    </select>
                </div>
                <div class="form-group">
                    <label for="descricao">Descrição</label>
                    <input type="text" id="descricao" required>
                </div>
                <div class="form-group">
                    <label for="valor">Valor</label>
                    <input type="number" id="valor" step="0.01" required>
                </div>
                <div class="form-group">
                    <label for="data-vencimento">Data de Vencimento</label>
                    <input type="date" id="data-vencimento" value="${new Date().toISOString().split('T')[0]}" required>
                </div>
                <div class="form-group">
                    <label for="status">Status</label>
                    <select id="status">
                        <option value="pendente">Pendente</option>
                        <option value="pago">Pago</option>
                        <option value="atrasado">Atrasado</option>
                        <option value="cancelado">Cancelado</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="tipo-faturamento">Tipo de Faturamento</label>
                    <select id="tipo-faturamento">
                        <option value="unico">Único</option>
                        <option value="recorrente">Recorrente</option>
                        <option value="personalizado">Personalizado</option>
                    </select>
                </div>
                <div class="form-group" id="recorrencia-group" style="display: none;">
                    <label for="recorrencia">Recorrência</label>
                    <select id="recorrencia">
                        <option value="mensal">Mensal</option>
                        <option value="anual">Anual</option>
                        <option value="semanal">Semanal</option>
                        <option value="quinzenal">Quinzenal</option>
                    </select>
                </div>
                <div class="form-group" id="numero-parcelas-group" style="display: none;">
                    <label for="numero-parcelas">Número de Parcelas</label>
                    <input type="number" id="numero-parcelas" min="2">
                </div>
                <button type="submit" class="btn btn-primary">Adicionar Faturamento</button>
            </form>
        `;
        openModal('Novo Faturamento', content);

        const tipoFaturamentoSelect = document.getElementById('tipo-faturamento');
        const recorrenciaGroup = document.getElementById('recorrencia-group');
        const numeroParcelasGroup = document.getElementById('numero-parcelas-group');

        tipoFaturamentoSelect.addEventListener('change', function() {
            if (this.value === 'recorrente') {
                recorrenciaGroup.style.display = 'block';
                numeroParcelasGroup.style.display = 'none';
            } else if (this.value === 'personalizado') {
                recorrenciaGroup.style.display = 'none';
                numeroParcelasGroup.style.display = 'block';
            } else {
                recorrenciaGroup.style.display = 'none';
                numeroParcelasGroup.style.display = 'none';
            }
        });

        document.getElementById('novo-faturamento-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            const tipoFaturamento = tipoFaturamentoSelect.value;
            const data = {
                cliente_id: document.getElementById('cliente-id').value,
                descricao: document.getElementById('descricao').value,
                valor: parseFloat(document.getElementById('valor').value),
                data_vencimento: document.getElementById('data-vencimento').value,
                status: document.getElementById('status').value,
                tipo: tipoFaturamento
            };

            if (tipoFaturamento === 'recorrente') {
                data.recorrencia = document.getElementById('recorrencia').value;
            } else if (tipoFaturamento === 'personalizado') {
                data.numero_parcelas = parseInt(document.getElementById('numero-parcelas').value);
            }

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
        showNotification('Erro ao carregar clientes para novo faturamento', 'error');
    }
}

// Função para editar faturamento - VERSÃO FINAL CORRIGIDA
async function editFaturamento(faturamentoId) {
    console.log('Iniciando edição do faturamento:', faturamentoId);
    
    try {
        const faturamento = await apiCall(`/faturamentos/${faturamentoId}`);
        console.log('Dados do faturamento carregados:', faturamento);
        
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
                alert('Faturamento atualizado com sucesso!');
                loadFaturamentos();
            } catch (error) {
                alert('Erro ao atualizar faturamento: ' + error.message);
            }
        });
        
    } catch (error) {
        console.error('Erro ao carregar dados do faturamento:', error);
        alert('Erro ao carregar dados do faturamento: ' + error.message);
    }
}


async function showNovoProdutoModal() {
    const content = `
        <form id="novo-produto-form">
            <div class="form-group">
                <label for="produto-cliente-id">Cliente</label>
                <select id="produto-cliente-id" required>
                    <!-- Options will be loaded dynamically -->
                </select>
            </div>
            <div class="form-group">
                <label for="produto-nome">Nome do Produto/Serviço</label>
                <input type="text" id="produto-nome" required>
            </div>
            <div class="form-group">
                <label for="produto-descricao">Descrição</label>
                <textarea id="produto-descricao"></textarea>
            </div>
            <div class="form-group">
                <label for="produto-valor">Valor</label>
                <input type="number" id="produto-valor" step="0.01" required>
            </div>
            <button type="submit" class="btn btn-primary">Adicionar Produto/Serviço</button>
        </form>
    `;
    openModal('Novo Produto/Serviço', content);

    // Load clients for the product form
    apiCall('/clientes').then(clientes => {
        const clienteSelect = document.getElementById('produto-cliente-id');
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            clienteSelect.appendChild(option);
        });
    }).catch(error => {
        showNotification('Erro ao carregar clientes para produto', 'error');
    });

    document.getElementById('novo-produto-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const clienteId = document.getElementById('produto-cliente-id').value;
        const data = {
            nome: document.getElementById('produto-nome').value,
            descricao: document.getElementById('produto-descricao').value,
            valor: parseFloat(document.getElementById('produto-valor').value)
        };
        try {
            await apiCall(`/clientes/${clienteId}/produtos`, 'POST', data);
            closeModal();
            showNotification('Produto/Serviço adicionado com sucesso!', 'success');
            if (currentClient && currentClient.id == clienteId) {
                loadClientDetail(currentClient.id);
            }
        } catch (error) {
            showNotification('Erro ao adicionar produto/serviço', 'error');
        }
    });
}

async function showEditProdutoModal(produtoId) {
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
                    <textarea id="edit-produto-descricao">${produto.descricao || ''}</textarea>
                </div>
                <div class="form-group">
                    <label for="edit-produto-valor">Valor</label>
                    <input type="number" id="edit-produto-valor" step="0.01" value="${produto.valor}" required>
                </div>
                <button type="submit" class="btn btn-primary">Salvar Alterações</button>
            </form>
        `;
        openModal('Editar Produto/Serviço', content);

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
                if (currentClient) {
                    loadClientDetail(currentClient.id);
                }
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
            if (currentClient) {
                loadClientDetail(currentClient.id);
            }
        } catch (error) {
            showNotification('Erro ao excluir produto/serviço', 'error');
        }
    }
}

async function showNovaAnotacaoModal() {
    const content = `
        <form id="nova-anotacao-form">
            <div class="form-group">
                <label for="anotacao-cliente-id">Cliente</label>
                <select id="anotacao-cliente-id" required>
                    <!-- Options will be loaded dynamically -->
                </select>
            </div>
            <div class="form-group">
                <label for="anotacao-titulo">Título</label>
                <input type="text" id="anotacao-titulo" required>
            </div>
            <div class="form-group">
                <label for="anotacao-conteudo">Conteúdo</label>
                <textarea id="anotacao-conteudo" required></textarea>
            </div>
            <button type="submit" class="btn btn-primary">Adicionar Anotação</button>
        </form>
    `;
    openModal('Nova Anotação', content);

    // Load clients for the annotation form
    apiCall('/clientes').then(clientes => {
        const clienteSelect = document.getElementById('anotacao-cliente-id');
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nome;
            clienteSelect.appendChild(option);
        });
    }).catch(error => {
        showNotification('Erro ao carregar clientes para anotação', 'error');
    });

    document.getElementById('nova-anotacao-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const clienteId = document.getElementById('anotacao-cliente-id').value;
        const data = {
            titulo: document.getElementById('anotacao-titulo').value,
            conteudo: document.getElementById('anotacao-conteudo').value
        };
        try {
            await apiCall(`/clientes/${clienteId}/anotacoes`, 'POST', data);
            closeModal();
            showNotification('Anotação adicionada com sucesso!', 'success');
            if (currentClient && currentClient.id == clienteId) {
                loadClientDetail(currentClient.id);
            }
        } catch (error) {
            showNotification('Erro ao adicionar anotação', 'error');
        }
    });
}

async function showEditAnotacaoModal(anotacaoId) {
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
                    <textarea id="edit-anotacao-conteudo">${anotacao.conteudo}</textarea>
                </div>
                <button type="submit" class="btn btn-primary">Salvar Alterações</button>
            </form>
        `;
        openModal('Editar Anotação', content);

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

// Funções de Formatação
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

function getMonthName(monthNumber) {
    const date = new Date();
    date.setMonth(monthNumber - 1);
    return date.toLocaleString('pt-BR', { month: 'long' });
}

function getMonthNumber(monthName) {
    const date = new Date(Date.parse(monthName + " 1, 2000"));
    return date.getMonth() + 1;
}
