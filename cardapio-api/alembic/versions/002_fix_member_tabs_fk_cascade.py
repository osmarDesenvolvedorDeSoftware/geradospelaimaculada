"""fix member_tabs FK to ensure ON DELETE CASCADE

Revision ID: 002_fix_member_tabs_fk_cascade
Revises: 001_member_system
Create Date: 2026-03-18 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '002_fix_member_tabs_fk_cascade'
down_revision: Union[str, None] = '001_member_system'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop the existing FK constraint (may or may not have CASCADE) and recreate
    # with ON DELETE CASCADE so that deleting a member removes its tabs automatically.
    op.drop_constraint('member_tabs_member_id_fkey', 'member_tabs', type_='foreignkey')
    op.create_foreign_key(
        'member_tabs_member_id_fkey',
        'member_tabs', 'members',
        ['member_id'], ['id'],
        ondelete='CASCADE',
    )


def downgrade() -> None:
    op.drop_constraint('member_tabs_member_id_fkey', 'member_tabs', type_='foreignkey')
    op.create_foreign_key(
        'member_tabs_member_id_fkey',
        'member_tabs', 'members',
        ['member_id'], ['id'],
    )
