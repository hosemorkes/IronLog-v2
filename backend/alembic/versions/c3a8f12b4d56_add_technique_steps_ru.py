"""add technique_steps_ru to exercises

Revision ID: c3a8f12b4d56
Revises: b7e4c91a2f03
Create Date: 2026-05-21 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "c3a8f12b4d56"
down_revision: Union[str, None] = "b7e4c91a2f03"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "exercises",
        sa.Column(
            "technique_steps_ru",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("exercises", "technique_steps_ru")
