from flask import Blueprint, request, jsonify, current_app
from src.models.user import db
from src.models.cliente import Cliente, ProdutoServico, Anotacao, Faturamento, ResumoMensal
from datetime import datetime, date, timedelta
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
    
    cliente.nome = data.get("nome", cliente.nome)
    cliente.contato = data.get("contato", cliente.contato)
    cliente.email = data.get("email", cliente.email)
    cliente.telefone = data.get("telefone", cliente.telefone)
    
    db.session.commit()
    
    return jsonify(cliente.to_dict())

@cliente_bp.route("/clientes/<int:cliente_id>", methods=["DELETE"])
def delete_cliente(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    db.session.delete(cliente)
    db.session.commit()
    
    return "", 204

# Rotas para buscar dados individuais
@cliente_bp.route("/produtos/<int:produto_id>", methods=["GET"])
def get_produto(produto_id):
    produto = ProdutoServico.query.get_or_404(produto_id)
    return jsonify(produto.to_dict())

@cliente_bp.route("/anotacoes/<int:anotacao_id>", methods=["GET"])
def get_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    return jsonify(anotacao.to_dict())

@cliente_bp.route("/faturamentos/<int:faturamento_id>", methods=["GET"])
def get_faturamento(faturamento_id):
    faturamento = Faturamento.query.get_or_404(faturamento_id)
    return jsonify(faturamento.to_dict())

# Rotas para Produtos/Serviços
@cliente_bp.route("/clientes/<int:cliente_id>/produtos", methods=["POST"])
def create_produto_servico(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    produto = ProdutoServico(
        cliente_id=cliente_id,
        nome=data["nome"],
        descricao=data.get("descricao", ""),
        valor=data["valor"]
    )
    
    db.session.add(produto)
    db.session.commit()
    
    return jsonify(produto.to_dict()), 201

@cliente_bp.route("/produtos/<int:produto_id>", methods=["PUT"])
def update_produto_servico(produto_id):
    produto = ProdutoServico.query.get_or_404(produto_id)
    data = request.get_json()
    
    produto.nome = data.get("nome", produto.nome)
    produto.descricao = data.get("descricao", produto.descricao)
    produto.valor = data.get("valor", produto.valor)
    
    db.session.commit()
    
    return jsonify(produto.to_dict())

@cliente_bp.route("/produtos/<int:produto_id>", methods=["DELETE"])
def delete_produto_servico(produto_id):
    produto = ProdutoServico.query.get_or_404(produto_id)
    db.session.delete(produto)
    db.session.commit()
    
    return "", 204

# Rotas para Anotações
@cliente_bp.route("/clientes/<int:cliente_id>/anotacoes", methods=["POST"])
def create_anotacao(cliente_id):
    cliente = Cliente.query.get_or_404(cliente_id)
    data = request.get_json()
    
    anotacao = Anotacao(
        cliente_id=cliente_id,
        titulo=data["titulo"],
        conteudo=data["conteudo"]
    )
    
    db.session.add(anotacao)
    db.session.commit()
    
    return jsonify(anotacao.to_dict()), 201

@cliente_bp.route("/anotacoes/<int:anotacao_id>", methods=["PUT"])
def update_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    data = request.get_json()
    
    anotacao.titulo = data.get("titulo", anotacao.titulo)
    anotacao.conteudo = data.get("conteudo", anotacao.conteudo)
    
    db.session.commit()
    
    return jsonify(anotacao.to_dict())

@cliente_bp.route("/anotacoes/<int:anotacao_id>", methods=["DELETE"])
def delete_anotacao(anotacao_id):
    anotacao = Anotacao.query.get_or_404(anotacao_id)
    db.session.delete(anotacao)
    db.session.commit()
    
    return "", 204

# Rotas para Faturamento
@cliente_bp.route("/clientes/<int:cliente_id>/faturamentos", methods=["POST"])
def create_faturamento(cliente_id):
    try:
        cliente = Cliente.query.get_or_404(cliente_id)
        data = request.get_json()
        
        # Log dos dados recebidos para debug
        current_app.logger.info(f"Dados recebidos para faturamento: {data}")
        
        # Tratar numero_parcelas para garantir que seja int ou None
        numero_parcelas_raw = data.get("numero_parcelas")
        numero_parcelas = int(numero_parcelas_raw) if numero_parcelas_raw not in [None, ""] else None

        faturamento = Faturamento(
            cliente_id=cliente_id,
            produto_servico_id=data.get("produto_servico_id"),
            descricao=data["descricao"],
            valor=data["valor"],
            data_vencimento=datetime.strptime(data["data_vencimento"], "%Y-%m-%d").date(),
            status=data.get("status", "pendente"),
            tipo=data.get("tipo", "unico"), # Usando o campo 'tipo' do seu modelo
            recorrencia=data.get("recorrencia"), # Usando o campo 'recorrencia' do seu modelo
            numero_parcelas=numero_parcelas,
            parcela_atual=data.get("parcela_atual", 1),
            faturamento_pai_id=data.get("faturamento_pai_id")
        )
        
        db.session.add(faturamento)
        db.session.commit()
        
        current_app.logger.info(f"Faturamento criado com sucesso: {faturamento.id}")
        return jsonify(faturamento.to_dict()), 201
        
    except Exception as e:
        current_app.logger.error(f"Erro ao criar faturamento: {str(e)}")
        db.session.rollback()
        return jsonify({"error": f"Erro ao criar faturamento: {str(e)}"}), 500

@cliente_bp.route("/faturamentos/<int:faturamento_id>", methods=["PUT"])
def update_faturamento(faturamento_id):
    faturamento = Faturamento.query.get_or_404(faturamento_id)
    data = request.get_json()
    
    faturamento.descricao = data.get("descricao", faturamento.descricao)
    faturamento.valor = data.get("valor", faturamento.valor)
    
    if "data_vencimento" in data:
        faturamento.data_vencimento = datetime.strptime(data["data_vencimento"], "%Y-%m-%d").date()
    
    if "status" in data:
        faturamento.status = data["status"]
        if data["status"] == "pago" and not faturamento.data_pagamento:
            faturamento.data_pagamento = date.today()
            # Lógica para gerar próximo faturamento recorrente
            if faturamento.tipo != "unico": # Se não for único, tenta gerar recorrência
                gerar_proximo_faturamento_recorrente(faturamento)
        elif data["status"] != "pago":
            faturamento.data_pagamento = None
    
    db.session.commit()
    
    return jsonify(faturamento.to_dict())

@cliente_bp.route("/faturamentos/<int:faturamento_id>", methods=["DELETE"])
def delete_faturamento(faturamento_id):
    faturamento = Faturamento.query.get_or_404(faturamento_id)
    db.session.delete(faturamento)
    db.session.commit()
    
    return "", 204

# Nova função para gerar o próximo faturamento recorrente
def gerar_proximo_faturamento_recorrente(faturamento_original):
    # Se for um faturamento único ou se já atingiu o número máximo de parcelas
    if faturamento_original.tipo == "unico" or \
       (faturamento_original.tipo == "personalizado" and faturamento_original.numero_parcelas and faturamento_original.parcela_atual >= faturamento_original.numero_parcelas):
        return

    proxima_data_vencimento = None
    
    if faturamento_original.tipo == "recorrente":
        if faturamento_original.recorrencia == "mensal":
            data_venc = faturamento_original.data_vencimento
            mes_novo = data_venc.month + 1
            ano_novo = data_venc.year
            if mes_novo > 12:
                mes_novo = 1
                ano_novo += 1
            try:
                proxima_data_vencimento = date(ano_novo, mes_novo, data_venc.day)
            except ValueError:
                proxima_data_vencimento = date(ano_novo, mes_novo, 1) + timedelta(days=-1) # Último dia do mês

        elif faturamento_original.recorrencia == "anual":
            proxima_data_vencimento = date(faturamento_original.data_vencimento.year + 1, 
                                           faturamento_original.data_vencimento.month, 
                                           faturamento_original.data_vencimento.day)
        elif faturamento_original.recorrencia == "semanal":
            proxima_data_vencimento = faturamento_original.data_vencimento + timedelta(weeks=1)
        elif faturamento_original.recorrencia == "quinzenal":
            proxima_data_vencimento = faturamento_original.data_vencimento + timedelta(weeks=2)

    elif faturamento_original.tipo == "personalizado":
        # Para faturamentos personalizados, a lógica de próxima data é mais complexa
        # e depende de como você define a recorrência personalizada (ex: a cada X dias, ou datas específicas)
        # Se você tiver uma lógica específica para a ser implementada aqui, me informe.
        # Exemplo: Se for personalizado por número de parcelas e a data de vencimento for a cada 30 dias
        if faturamento_original.numero_parcelas and faturamento_original.parcela_atual < faturamento_original.numero_parcelas:
            proxima_data_vencimento = faturamento_original.data_vencimento + timedelta(days=30) # Exemplo: a cada 30 dias
        else:
            return # Não gera nova parcela se já atingiu o limite

    
    if proxima_data_vencimento:
        # Verifica se já existe um faturamento para a próxima data de vencimento
        # Isso evita duplicação caso a função seja chamada múltiplas vezes
        faturamento_existente = Faturamento.query.filter(
            Faturamento.cliente_id == faturamento_original.cliente_id,
            Faturamento.descricao == faturamento_original.descricao, # Ou outro critério único
            Faturamento.valor == faturamento_original.valor,
            Faturamento.data_vencimento == proxima_data_vencimento,
            Faturamento.faturamento_pai_id == faturamento_original.id # Vincula ao faturamento original
        ).first()

        if not faturamento_existente:
            novo_faturamento = Faturamento(
                cliente_id=faturamento_original.cliente_id,
                produto_servico_id=faturamento_original.produto_servico_id,
                descricao=faturamento_original.descricao,
                valor=faturamento_original.valor,
                data_vencimento=proxima_data_vencimento,
                status="pendente",
                tipo=faturamento_original.tipo, # Mantém o tipo
                recorrencia=faturamento_original.recorrencia, # Mantém a recorrência
                numero_parcelas=faturamento_original.numero_parcelas, # Mantém o mesmo número de parcelas se houver
                parcela_atual=(faturamento_original.parcela_atual + 1) if faturamento_original.parcela_atual else 1,
                faturamento_pai_id=faturamento_original.id # Referência ao faturamento que gerou este
            )
            db.session.add(novo_faturamento)
            db.session.commit()
            current_app.logger.info(f"Novo faturamento recorrente gerado: {novo_faturamento.id} para o cliente {novo_faturamento.cliente_id}")
        else:
            current_app.logger.info(f"Faturamento recorrente para {proxima_data_vencimento} já existe para o faturamento original {faturamento_original.id}")

# Rota para estatísticas do dashboard
@cliente_bp.route("/dashboard/stats", methods=["GET"])
def get_dashboard_stats():
    from sqlalchemy import func
    
    # Valores a receber (pendentes)
    a_receber = db.session.query(func.sum(Faturamento.valor)).filter(
        Faturamento.status == "pendente"
    ).scalar() or 0
    
    # Valores vencidos (atrasados)
    vencido = db.session.query(func.sum(Faturamento.valor)).filter(
        Faturamento.status == "pendente",
        Faturamento.data_vencimento < date.today()
    ).scalar() or 0
    
    # Valores recebidos (pagos)
    recebido = db.session.query(func.sum(Faturamento.valor)).filter(
        Faturamento.status == "pago"
    ).scalar() or 0
    
    # Valores cancelados
    cancelado = db.session.query(func.sum(Faturamento.valor)).filter(
        Faturamento.status == "cancelado"
    ).scalar() or 0
    
    # Últimos faturamentos
    ultimos_faturamentos = Faturamento.query.join(Cliente).order_by(
        Faturamento.data_criacao.desc()
    ).limit(10).all()
    
    faturamentos_data = []
    for fat in ultimos_faturamentos:
        fat_dict = fat.to_dict()
        fat_dict["cliente_nome"] = fat.cliente.nome
        faturamentos_data.append(fat_dict)
    
    return jsonify({
        "a_receber": a_receber,
        "vencido": vencido,
        "recebido": recebido,
        "cancelado": cancelado,
        "ultimos_faturamentos": faturamentos_data
    })

# Rotas para Resumo Mensal
@cliente_bp.route("/resumo-mensal", methods=["GET"])
def get_resumo_mensal():
    # Pegar parâmetros de mês e ano (opcional)
    mes = request.args.get("mes", type=int)
    ano = request.args.get("ano", type=int)
    
    if mes and ano:
        # Buscar resumo específico
        resumo = ResumoMensal.query.filter_by(mes=mes, ano=ano).first()
        if resumo:
            return jsonify(resumo.to_dict())
        else:
            # Calcular resumo em tempo real se não existir
            resumo_data = calcular_resumo_mensal(mes, ano)
            return jsonify(resumo_data)
    else:
        # Retornar últimos 3 meses
        resumos = ResumoMensal.query.order_by(ResumoMensal.ano.desc(), ResumoMensal.mes.desc()).limit(3).all()
        return jsonify([resumo.to_dict() for resumo in resumos])

@cliente_bp.route("/resumo-mensal/atualizar", methods=["POST"])
def atualizar_resumo_mensal():
    data = request.get_json()
    mes = data.get("mes", datetime.now().month)
    ano = data.get("ano", datetime.now().year)
    
    # Calcular resumo
    resumo_data = calcular_resumo_mensal(mes, ano)
    
    # Buscar ou criar registro
    resumo = ResumoMensal.query.filter_by(mes=mes, ano=ano).first()
    if not resumo:
        resumo = ResumoMensal(mes=mes, ano=ano)
        db.session.add(resumo)
    
    # Atualizar valores
    resumo.total_recebido = resumo_data["total_recebido"]
    resumo.total_pendente = resumo_data["total_pendente"]
    resumo.total_vencido = resumo_data["total_vencido"]
    resumo.total_cancelado = resumo_data["total_cancelado"]
    resumo.data_atualizacao = datetime.utcnow()
    
    db.session.commit()
    
    return jsonify(resumo.to_dict())

def calcular_resumo_mensal(mes, ano):
    """Calcula o resumo mensal baseado nos faturamentos"""
    from sqlalchemy import and_, extract
    
    try:
        current_app.logger.info(f"Calculando resumo para mes={mes}, ano={ano}")

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
