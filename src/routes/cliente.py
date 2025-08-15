from flask import Blueprint, request, jsonify, current_app
from src.models.user import db
from src.models.cliente import Cliente, ProdutoServico, Anotacao, Faturamento, ResumoMensal
from datetime import datetime, date
from sqlalchemy import and_, extract

cliente_bp = Blueprint("cliente", __name__)

# Rotas para Clientes
@cliente_bp.route("/clientes", methods=["GET"])
def get_clientes():
    clientes = Cliente.query.all()
    return jsonify([cliente.to_dict() for cliente in clientes])

@cliente_bp.route("/clientes", methods=["POST"])
def create_cliente():
    data = request.get_json()
    
    cliente = Cliente(
        nome=data["nome"],
        contato=data["contato"],
        email=data["email"],
        telefone=data["telefone"]
    )
    
    db.session.add(cliente)
    db.session.commit()
    
    return jsonify(cliente.to_dict()), 201

@cliente_bp.route("/clientes/<int:cliente_id>", methods=["GET"])
def get_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    cliente_data = cliente.to_dict()
    
    # Incluir produtos/serviços
    cliente_data["produtos"] = [produto.to_dict() for produto in cliente.produtos]
    
    # Incluir anotações
    cliente_data["anotacoes"] = [anotacao.to_dict() for anotacao in cliente.anotacoes]
    
    # Incluir faturamentos
    cliente_data["faturamentos"] = [faturamento.to_dict() for faturamento in cliente.faturamentos]
    
    return jsonify(cliente_data)

@cliente_bp.route("/clientes/<int:cliente_id>", methods=["PUT"])
def update_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    cliente.nome = data["nome"]
    cliente.contato = data["contato"]
    cliente.email = data["email"]
    cliente.telefone = data["telefone"]
    
    db.session.commit()
    return jsonify(cliente.to_dict())

@cliente_bp.route("/clientes/<int:cliente_id>", methods=["DELETE"])
def delete_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    db.session.delete(cliente)
    db.session.commit()
    return jsonify({"message": "Cliente excluído com sucesso"}), 200

# Rotas para Produtos/Serviços
@cliente_bp.route("/clientes/<int:cliente_id>/produtos", methods=["POST"])
def create_produto(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    produto = ProdutoServico(
        cliente_id=cliente.id,
        nome=data["nome"],
        descricao=data.get("descricao"),
        valor=float(data["valor"])
    )
    
    db.session.add(produto)
    db.session.commit()
    return jsonify(produto.to_dict()), 201

@cliente_bp.route("/produtos/<int:produto_id>", methods=["DELETE"])
def delete_produto(produto_id):
    produto = ProdutoServico.query.get_or_404(produto_id)
    db.session.delete(produto)
    db.session.commit()
    return jsonify({"message": "Produto/Serviço excluído com sucesso"}), 200

# Rotas para Anotações
@cliente_bp.route("/clientes/<int:cliente_id>/anotacoes", methods=["POST"])
def create_anotacao(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    anotacao = Anotacao(
        cliente_id=cliente.id,
        titulo=data["titulo"],
        conteudo=data["conteudo"]
    )
    
    db.session.add(anotacao)
    db.session.commit()
    return jsonify(anotacao.to_dict()), 201

@cliente_bp.route("/anotacoes/<int:anotacao_id>", methods=["DELETE"])
def delete_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    db.session.delete(anotacao)
    db.session.commit()
    return jsonify({"message": "Anotação excluída com sucesso"}), 200

# Rotas para Faturamentos
@cliente_bp.route("/faturamentos", methods=["GET"])
def get_faturamentos():
    faturamentos = Faturamento.query.all()
    return jsonify([fat.to_dict() for fat in faturamentos])

@cliente_bp.route("/clientes/<int:cliente_id>/faturamentos", methods=["POST"])
def create_faturamento(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    # Tratar numero_parcelas para garantir que seja int ou None
    numero_parcelas_raw = data.get("numero_parcelas")
    numero_parcelas = int(numero_parcelas_raw) if numero_parcelas_raw not in [None, ""] else None

    faturamento = Faturamento(
        cliente_id=cliente.id,
        descricao=data["descricao"],
        valor=float(data["valor"]),
        data_vencimento=datetime.strptime(data["data_vencimento"], "%Y-%m-%d").date(),
        status=data.get("status", "pendente"),
        tipo_recorrencia=data.get("tipo_recorrencia"),
        numero_parcelas=numero_parcelas
    )
    
    db.session.add(faturamento)
    db.session.commit()
    return jsonify(faturamento.to_dict()), 201

@cliente_bp.route("/faturamentos/<int:faturamento_id>", methods=["DELETE"])
def delete_faturamento(faturamento_id):
    faturamento = Faturamento.query.get_or_404(faturamento_id)
    db.session.delete(faturamento)
    db.session.commit()
    return jsonify({"message": "Faturamento excluído com sucesso"}), 200

# Rotas para produtos individuais (GET e PUT)
@cliente_bp.route("/produtos/<int:produto_id>", methods=["GET"])
def get_produto(produto_id):
    produto = ProdutoServico.query.get_or_404(produto_id)
    return jsonify(produto.to_dict())

@cliente_bp.route("/produtos/<int:produto_id>", methods=["PUT"])
def update_produto(produto_id):
    produto = ProdutoServico.query.get_or_404(produto_id)
    data = request.get_json()
    
    produto.nome = data["nome"]
    produto.descricao = data.get("descricao", "")
    produto.valor = float(data["valor"])
    
    db.session.commit()
    return jsonify(produto.to_dict())

# Rotas para anotações individuais (GET e PUT)
@cliente_bp.route("/anotacoes/<int:anotacao_id>", methods=["GET"])
def get_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    return jsonify(anotacao.to_dict())

@cliente_bp.route("/anotacoes/<int:anotacao_id>", methods=["PUT"])
def update_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    data = request.get_json()
    
    anotacao.titulo = data["titulo"]
    anotacao.conteudo = data["conteudo"]
    
    db.session.commit()
    return jsonify(anotacao.to_dict())

# Rota para faturamento individual (GET e PUT)
@cliente_bp.route("/faturamentos/<int:faturamento_id>", methods=["GET"])
def get_faturamento(faturamento_id):
    faturamento = Faturamento.query.get_or_404(faturamento_id)
    return jsonify(faturamento.to_dict())

@cliente_bp.route("/faturamentos/<int:faturamento_id>", methods=["PUT"])
def update_faturamento(faturamento_id):
    faturamento = Faturamento.query.get_or_404(faturamento_id)
    data = request.get_json()
    
    faturamento.descricao = data["descricao"]
    faturamento.valor = float(data["valor"])
    faturamento.data_vencimento = datetime.strptime(data["data_vencimento"], "%Y-%m-%d").date()
    faturamento.status = data["status"]
    
    if data["status"] == "pago" and not faturamento.data_pagamento:
        faturamento.data_pagamento = date.today()
    elif data["status"] != "pago":
        faturamento.data_pagamento = None
    
    db.session.commit()
    return jsonify(faturamento.to_dict())

# Rota para resumo mensal (já existente)
@cliente_bp.route("/resumo-mensal", methods=["GET"])
def calcular_resumo_mensal():
    mes = request.args.get("mes", type=int)
    ano = request.args.get("ano", type=int)

    if not mes or not ano:
        return jsonify({"error": "Parâmetros 'mes' e 'ano' são obrigatórios"}), 400

    try:
        current_app.logger.info(f"Calculando resumo para {mes}/{ano}")

        # Filtrar faturamentos do mês/ano específico
        faturamentos = Faturamento.query.filter(
            and_(
                extract("month", Faturamento.data_vencimento) == mes,
                extract("year", Faturamento.data_vencimento) == ano
            )
        ).all()
        current_app.logger.info(f"Faturamentos encontrados: {len(faturamentos)}")

        total_recebido = sum(f.valor for f in faturamentos if f.status == "pago")
        total_pendente = sum(f.valor for f in faturamentos if f.status == "pendente")
        total_vencido = sum(f.valor for f in faturamentos if f.status == "atrasado")
        total_cancelado = sum(f.valor for f in faturamentos if f.status == "cancelado")
        
        current_app.logger.info(f"Totais: Recebido={total_recebido}, Pendente={total_pendente}, Vencido={total_vencido}, Cancelado={total_cancelado}")

        return {
            "mes": mes,
            "ano": ano,
            "total_recebido": total_recebido,
            "total_pendente": total_pendente,
            "total_vencido": total_vencido,
            "total_cancelado": total_cancelado
        }
    except Exception as e:
        current_app.logger.error(f"Erro ao calcular resumo mensal: {e}")
        return {
            "mes": mes,
            "ano": ano,
            "total_recebido": 0.0,
            "total_pendente": 0.0,
            "total_vencido": 0.0,
            "total_cancelado": 0.0,
            "error": str(e)
        }