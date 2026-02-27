"""add members, member_tabs, member_price, payment_method

Revision ID: 001_member_system
Revises: 
Create Date: 2025-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_member_system'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabela: members
    op.create_table(
        'members',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('email', sa.String(), nullable=False),
        sa.Column('hashed_password', sa.String(), nullable=False),
        sa.Column('phone', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email'),
    )
    op.create_index('ix_members_email', 'members', ['email'], unique=True)

    # Tabela: member_tabs
    op.create_table(
        'member_tabs',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('member_id', sa.String(), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('year', sa.Integer(), nullable=False),
        sa.Column('total_consumed', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('total_paid', sa.Numeric(precision=10, scale=2), nullable=False, server_default='0.00'),
        sa.Column('status', sa.String(), nullable=False, server_default='aberta'),
        sa.Column('closed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['member_id'], ['members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_member_tabs_member_month_year', 'member_tabs', ['member_id', 'month', 'year'])

    # Coluna: items.member_price
    op.add_column('items', sa.Column('member_price', sa.Numeric(precision=10, scale=2), nullable=True))

    # Coluna: orders.payment_method
    op.add_column('orders', sa.Column('payment_method', sa.String(), nullable=False, server_default='pix'))

    # Coluna: orders.member_id
    op.add_column('orders', sa.Column('member_id', sa.String(), nullable=True))
    op.create_foreign_key(
        'fk_orders_member_id',
        'orders', 'members',
        ['member_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('fk_orders_member_id', 'orders', type_='foreignkey')
    op.drop_column('orders', 'member_id')
    op.drop_column('orders', 'payment_method')
    op.drop_column('items', 'member_price')
    op.drop_index('ix_member_tabs_member_month_year', table_name='member_tabs')
    op.drop_table('member_tabs')
    op.drop_index('ix_members_email', table_name='members')
    op.drop_table('members')
