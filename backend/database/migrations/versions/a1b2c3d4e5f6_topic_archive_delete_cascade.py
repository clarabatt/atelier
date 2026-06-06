"""topic_archive_delete_cascade

Revision ID: a1b2c3d4e5f6
Revises: 7af98d782946
Create Date: 2026-05-27 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op


revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7af98d782946'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add status column to topics
    op.add_column(
        'topics',
        sa.Column(
            'status',
            sa.Enum('active', 'archived', name='topicstatus'),
            nullable=False,
            server_default='active',
        ),
    )

    # Re-create FK constraints with ON DELETE CASCADE for full cascade delete support
    op.drop_constraint('batches_topic_id_fkey', 'batches', type_='foreignkey')
    op.create_foreign_key(
        'batches_topic_id_fkey', 'batches', 'topics', ['topic_id'], ['id'], ondelete='CASCADE'
    )

    op.drop_constraint('topic_stats_topic_id_fkey', 'topic_stats', type_='foreignkey')
    op.create_foreign_key(
        'topic_stats_topic_id_fkey', 'topic_stats', 'topics', ['topic_id'], ['id'], ondelete='CASCADE'
    )

    op.drop_constraint('questions_batch_id_fkey', 'questions', type_='foreignkey')
    op.create_foreign_key(
        'questions_batch_id_fkey', 'questions', 'batches', ['batch_id'], ['id'], ondelete='CASCADE'
    )

    op.drop_constraint('sessions_batch_id_fkey', 'sessions', type_='foreignkey')
    op.create_foreign_key(
        'sessions_batch_id_fkey', 'sessions', 'batches', ['batch_id'], ['id'], ondelete='CASCADE'
    )

    op.drop_constraint('attempts_question_id_fkey', 'attempts', type_='foreignkey')
    op.create_foreign_key(
        'attempts_question_id_fkey', 'attempts', 'questions', ['question_id'], ['id'], ondelete='CASCADE'
    )

    op.drop_constraint('attempts_session_id_fkey', 'attempts', type_='foreignkey')
    op.create_foreign_key(
        'attempts_session_id_fkey', 'attempts', 'sessions', ['session_id'], ['id'], ondelete='CASCADE'
    )


def downgrade() -> None:
    op.drop_column('topics', 'status')

    # Restore FK constraints without CASCADE
    op.drop_constraint('batches_topic_id_fkey', 'batches', type_='foreignkey')
    op.create_foreign_key('batches_topic_id_fkey', 'batches', 'topics', ['topic_id'], ['id'])

    op.drop_constraint('topic_stats_topic_id_fkey', 'topic_stats', type_='foreignkey')
    op.create_foreign_key('topic_stats_topic_id_fkey', 'topic_stats', 'topics', ['topic_id'], ['id'])

    op.drop_constraint('questions_batch_id_fkey', 'questions', type_='foreignkey')
    op.create_foreign_key('questions_batch_id_fkey', 'questions', 'batches', ['batch_id'], ['id'])

    op.drop_constraint('sessions_batch_id_fkey', 'sessions', type_='foreignkey')
    op.create_foreign_key('sessions_batch_id_fkey', 'sessions', 'batches', ['batch_id'], ['id'])

    op.drop_constraint('attempts_question_id_fkey', 'attempts', type_='foreignkey')
    op.create_foreign_key('attempts_question_id_fkey', 'attempts', 'questions', ['question_id'], ['id'])

    op.drop_constraint('attempts_session_id_fkey', 'attempts', type_='foreignkey')
    op.create_foreign_key('attempts_session_id_fkey', 'attempts', 'sessions', ['session_id'], ['id'])
