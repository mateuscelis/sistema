from flask import Blueprint, request, jsonify
from src.models.user import db
from src.models.cliente import Cliente, ProdutoServico, Anotacao, Faturamento
from datetime import datetime, date

cliente_bp = Blueprint('cliente', __name__)

# Rotas para Clientes
@cliente_bp.route('/clientes', methods=['GET'])
def get_clientes():
    clientes = Cliente.query.all()
    return jsonify([cliente.to_dict() for cliente in clientes])

@cliente_bp.route('/clientes', methods=['POST'])
def create_cliente():
    data = request.get_json()
    
    cliente = Cliente(
        nome=data['nome'],
        contato=data['contato'],
        email=data['email'],
        telefone=data['telefone']
    )
    
    db.session.add(cliente)
    db.session.commit()
    
    return jsonify(cliente.to_dict()), 201

@cliente_bp.route('/clientes/<int:cliente_id>', methods=['GET'])
def get_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    cliente_data = cliente.to_dict()
    
    # Incluir produtos/serviços
    cliente_data['produtos'] = [produto.to_dict() for produto in cliente.produtos]
    
    # Incluir anotações
    cliente_data['anotacoes'] = [anotacao.to_dict() for anotacao in cliente.anotacoes]
    
    # Incluir faturamentos
    cliente_data['faturamentos'] = [faturamento.to_dict() for faturamento in cliente.faturamentos]
    
    return jsonify(cliente_data)

@cliente_bp.route('/clientes/<int:cliente_id>', methods=['PUT'])
def update_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    cliente.nome = data.get('nome', cliente.nome)
    cliente.contato = data.get('contato', cliente.contato)
    cliente.email = data.get('email', cliente.email)
    cliente.telefone = data.get('telefone', cliente.telefone)
    
    db.session.commit()
    
    return jsonify(cliente.to_dict())

@cliente_bp.route('/clientes/<int:cliente_id>', methods=['DELETE'])
def delete_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    db.session.delete(cliente)
    db.session.commit()
    
    return '', 204

# Rotas para buscar dados individuais
@cliente_bp.route('/produtos/<int:produto_id>', methods=['GET'])
def get_produto(produto_id):
    produto = ProdutoServico.query.get_or_404(produto_id)
    return jsonify(produto.to_dict())

@cliente_bp.route('/anotacoes/<int:anotacao_id>', methods=['GET'])
def get_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    return jsonify(anotacao.to_dict())

@cliente_bp.route('/faturamentos/<int:faturamento_id>', methods=['GET'])
def get_faturamento(faturamento_id):
    faturamento = Faturamento.query.get_or_404(faturamento_id)
    return jsonify(faturamento.to_dict())

# Rotas para Produtos/Serviços
@cliente_bp.route('/clientes/<int:cliente_id>/produtos', methods=['POST'])
def create_produto_servico(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    produto = ProdutoServico(
        cliente_id=cliente_id,
        nome=data['nome'],
        descricao=data.get('descricao', ''),
        valor=data['valor']
    )
    
    db.session.add(produto)
    db.session.commit()
    
    return jsonify(produto.to_dict()), 201

@cliente_bp.route('/produtos/<int:produto_id>', methods=['PUT'])
def update_produto_servico(produto_id):
    produto = ProdutoServico.query.get_or_404(produto_id)
    data = request.get_json()
    
    produto.nome = data.get('nome', produto.nome)
    produto.descricao = data.get('descricao', produto.descricao)
    produto.valor = data.get('valor', produto.valor)
    
    db.session.commit()
    
    return jsonify(produto.to_dict())

@cliente_bp.route('/produtos/<int:produto_id>', methods=['DELETE'])
def delete_produto_servico(produto_id):
    produto = ProdutoServico.query.get_or_404(produto_id)
    db.session.delete(produto)
    db.session.commit()
    
    return '', 204

# Rotas para Anotações
@cliente_bp.route('/clientes/<int:cliente_id>/anotacoes', methods=['POST'])
def create_anotacao(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    anotacao = Anotacao(
        cliente_id=cliente_id,
        titulo=data['titulo'],
        conteudo=data['conteudo']
    )
    
    db.session.add(anotacao)
    db.session.commit()
    
    return jsonify(anotacao.to_dict()), 201

@cliente_bp.route('/anotacoes/<int:anotacao_id>', methods=['PUT'])
def update_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    data = request.get_json()
    
    anotacao.titulo = data.get('titulo', anotacao.titulo)
    anotacao.conteudo = data.get('conteudo', anotacao.conteudo)
    
    db.session.commit()
    
    return jsonify(anotacao.to_dict())

@cliente_bp.route('/anotacoes/<int:anotacao_id>', methods=['DELETE'])
def delete_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    db.session.delete(anotacao)
    db.session.commit()
    
    return '', 204

# Rotas para Faturamento
@cliente_bp.route('/clientes/<int:cliente_id>/faturamentos', methods=['POST'])
def create_faturamento(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    faturamento = Faturamento(
        cliente_id=cliente_id,
        produto_servico_id=data.get('produto_servico_id'),
        descricao=data['descricao'],
        valor=data['valor'],
        data_vencimento=datetime.strptime(data['data_vencimento'], '%Y-%m-%d').date(),
        status=data.get('status', 'pendente')
    )
    
    db.session.add(faturamento)
    db.session.commit()
    
    return jsonify(faturamento.to_dict()), 201

@cliente_bp.route('/faturamentos/<int:faturamento_id>', methods=['PUT'])
def update_faturamento(faturamento_id):
    faturamento = Faturamento.query.get_or_404(faturamento_id)
    data = request.get_json()
    
    faturamento.descricao = data.get('descricao', faturamento.descricao)
    faturamento.valor = data.get('valor', faturamento.valor)
    
    if 'data_vencimento' in data:
        faturamento.data_vencimento = datetime.strptime(data['data_vencimento'], '%Y-%m-%d').date()
    
    if 'status' in data:
        faturamento.status = data['status']
        if data['status'] == 'pago' and not faturamento.data_pagamento:
            faturamento.data_pagamento = date.today()
        elif data['status'] != 'pago':
            faturamento.data_pagamento = None
    
    db.session.commit()
    
    return jsonify(faturamento.to_dict())

@cliente_bp.route('/faturamentos/<int:faturamento_id>', methods=['DELETE'])
def delete_faturamento(faturamento_id):
    faturamento = Faturamento.query.get_or_404(faturamento_id)
    db.session.delete(faturamento)
    db.session.commit()
    
    return '', 204

# Rota para estatísticas do dashboard
@cliente_bp.route('/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    from sqlalchemy import func
    
    # Valores a receber (pendentes)
    a_receber = db.session.query(func.sum(Faturamento.valor)).filter(
        Faturamento.status == 'pendente'
    ).scalar() or 0
    
    # Valores vencidos (atrasados)
    vencido = db.session.query(func.sum(Faturamento.valor)).filter(
        Faturamento.status == 'pendente',
        Faturamento.data_vencimento < date.today()
    ).scalar() or 0
    
    # Valores recebidos (pagos)
    recebido = db.session.query(func.sum(Faturamento.valor)).filter(
        Faturamento.status == 'pago'
    ).scalar() or 0
    
    # Valores cancelados
    cancelado = db.session.query(func.sum(Faturamento.valor)).filter(
        Faturamento.status == 'cancelado'
    ).scalar() or 0
    
    # Últimos faturamentos
    ultimos_faturamentos = Faturamento.query.join(Cliente).order_by(
        Faturamento.data_criacao.desc()
    ).limit(10).all()
    
    faturamentos_data = []
    for fat in ultimos_faturamentos:
        fat_dict = fat.to_dict()
        fat_dict['cliente_nome'] = fat.cliente.nome
        faturamentos_data.append(fat_dict)
    
    return jsonify({
        'a_receber': a_receber,
        'vencido': vencido,
        'recebido': recebido,
        'cancelado': cancelado,
        'ultimos_faturamentos': faturamentos_data
    })



# Função para atualizar status de faturamentos atrasados
@cliente_bp.route('/faturamentos/update-status', methods=['POST'])
def update_overdue_status():
    from datetime import date
    
    # Buscar faturamentos pendentes com data de vencimento passada
    faturamentos_atrasados = Faturamento.query.filter(
        Faturamento.status == 'pendente',
        Faturamento.data_vencimento < date.today()
    ).all()
    
    count = 0
    for faturamento in faturamentos_atrasados:
        faturamento.status = 'atrasado'
        count += 1
    
    db.session.commit()
    
    return jsonify({
        'message': f'{count} faturamentos atualizados para status atrasado',
        'count': count
    })

