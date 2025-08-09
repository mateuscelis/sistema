from src.models.user import db
from datetime import datetime

class Cliente(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(100), nullable=False)
    contato = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    telefone = db.Column(db.String(20), nullable=False)
    data_cadastro = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamentos
    produtos = db.relationship('ProdutoServico', backref='cliente', lazy=True, cascade='all, delete-orphan')
    anotacoes = db.relationship('Anotacao', backref='cliente', lazy=True, cascade='all, delete-orphan')
    faturamentos = db.relationship('Faturamento', backref='cliente', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Cliente {self.nome}>'

    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'contato': self.contato,
            'email': self.email,
            'telefone': self.telefone,
            'data_cadastro': self.data_cadastro.isoformat() if self.data_cadastro else None
        }

class ProdutoServico(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    nome = db.Column(db.String(100), nullable=False)
    descricao = db.Column(db.Text)
    valor = db.Column(db.Float, nullable=False)
    data_cadastro = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<ProdutoServico {self.nome}>'

    def to_dict(self):
        return {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'nome': self.nome,
            'descricao': self.descricao,
            'valor': self.valor,
            'data_cadastro': self.data_cadastro.isoformat() if self.data_cadastro else None
        }

class Anotacao(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    titulo = db.Column(db.String(100), nullable=False)
    conteudo = db.Column(db.Text, nullable=False)
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f'<Anotacao {self.titulo}>'

    def to_dict(self):
        return {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'titulo': self.titulo,
            'conteudo': self.conteudo,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }

class Faturamento(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('cliente.id'), nullable=False)
    produto_servico_id = db.Column(db.Integer, db.ForeignKey('produto_servico.id'), nullable=True)
    descricao = db.Column(db.String(200), nullable=False)
    valor = db.Column(db.Float, nullable=False)
    data_vencimento = db.Column(db.Date, nullable=False)
    data_pagamento = db.Column(db.Date, nullable=True)
    status = db.Column(db.String(20), default='pendente')  # pendente, pago, atrasado, cancelado
    
    # Novos campos para tipos de faturamento
    tipo = db.Column(db.String(20), nullable=False, default='unico')  # unico, recorrente, personalizado
    recorrencia = db.Column(db.String(20), nullable=True)  # semanal, quinzenal, mensal, anual
    numero_parcelas = db.Column(db.Integer, nullable=True)  # Para pagamento personalizado
    parcela_atual = db.Column(db.Integer, nullable=True, default=1)  # Para controle de parcelas
    faturamento_pai_id = db.Column(db.Integer, db.ForeignKey('faturamento.id'), nullable=True)  # Para vincular parcelas
    
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relacionamento para parcelas filhas
    parcelas = db.relationship('Faturamento', backref=db.backref('faturamento_pai', remote_side=[id]), lazy=True)

    def __repr__(self):
        return f'<Faturamento {self.descricao}>'

    def to_dict(self):
        return {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'produto_servico_id': self.produto_servico_id,
            'descricao': self.descricao,
            'valor': self.valor,
            'data_vencimento': self.data_vencimento.isoformat() if self.data_vencimento else None,
            'data_pagamento': self.data_pagamento.isoformat() if self.data_pagamento else None,
            'status': self.status,
            'tipo': self.tipo,
            'recorrencia': self.recorrencia,
            'numero_parcelas': self.numero_parcelas,
            'parcela_atual': self.parcela_atual,
            'faturamento_pai_id': self.faturamento_pai_id,
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }


class ResumoMensal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    mes = db.Column(db.Integer, nullable=False)  # 1-12
    ano = db.Column(db.Integer, nullable=False)  # 2024, 2025, etc
    total_recebido = db.Column(db.Float, default=0.0)
    total_pendente = db.Column(db.Float, default=0.0)
    total_vencido = db.Column(db.Float, default=0.0)
    total_cancelado = db.Column(db.Float, default=0.0)
    data_atualizacao = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<ResumoMensal {self.mes}/{self.ano}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'mes': self.mes,
            'ano': self.ano,
            'total_recebido': self.total_recebido,
            'total_pendente': self.total_pendente,
            'total_vencido': self.total_vencido,
            'total_cancelado': self.total_cancelado,
            'data_atualizacao': self.data_atualizacao.isoformat() if self.data_atualizacao else None
        }

