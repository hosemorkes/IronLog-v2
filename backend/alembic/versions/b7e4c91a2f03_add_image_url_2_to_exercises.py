"""add image_url_2 to exercises

Revision ID: b7e4c91a2f03
Revises: df437e447c10
Create Date: 2026-05-21 16:02:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "b7e4c91a2f03"
down_revision: Union[str, None] = "df437e447c10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("exercises", sa.Column("image_url_2", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("exercises", "image_url_2")
