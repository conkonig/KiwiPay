3.3 Worker: claim one job safely

Build: Worker loop:
• Find one PENDING job
• Mark it IN_PROGRESS + set locked_at/locked_by
• Return claimed job
• (For now, single worker only is fine)

Hint: use a transaction + SELECT ... FOR UPDATE SKIP LOCKED to claim safely (this is your first concurrency taste).

Test: If two workers run, they don’t claim the same job.

(We can do this later; first just get one worker working.)

✅ Commit message:
step-3.3: worker can claim jobs with db lock
