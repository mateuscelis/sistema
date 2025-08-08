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
    data_criacao = db.Column(db.DateTime, default=datetime.utcnow)

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
            'data_criacao': self.data_criacao.isoformat() if self.data_criacao else None
        }

