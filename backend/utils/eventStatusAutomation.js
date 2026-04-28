async function syncEventStatuses(pool) {
  await pool.query(
    `UPDATE events
     SET status = CASE
       WHEN status = 'cancelled' OR status = 'draft' THEN status
       WHEN (event_date + end_time) < NOW() THEN 'completed'
       WHEN (event_date + start_time) <= NOW() AND (event_date + end_time) >= NOW() THEN 'in_progress'
       WHEN (event_date + start_time) > NOW() AND status = 'in_progress' THEN 'confirmed'
       ELSE status
     END
     WHERE status IN ('pending', 'confirmed', 'in_progress', 'completed')`
  );
}

module.exports = {
  syncEventStatuses,
};
