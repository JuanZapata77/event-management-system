const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { syncEventStatuses } = require('../utils/eventStatusAutomation');

async function getEventById(eventId) {
    const eventResult = await pool.query(
        `SELECT id, event_name, event_date, start_time, end_time, status
         FROM events
         WHERE id = $1`,
        [eventId]
    );

    if (eventResult.rows.length === 0) {
        return null;
    }

    return eventResult.rows[0];
}

async function getWorkerById(userId) {
    const workerResult = await pool.query(
        `SELECT id, name, role, is_available_for_shifts, unavailable_from, unavailable_to
         FROM users
         WHERE id = $1`,
        [userId]
    );

    if (workerResult.rows.length === 0) {
        return null;
    }

    return workerResult.rows[0];
}

async function hasShiftConflict({ userId, eventId, excludeAssignmentId = null }) {
    const overlapQuery = await pool.query(
        `SELECT sa.id
         FROM staff_assignments sa
         JOIN events e_existing ON e_existing.id = sa.event_id
         JOIN events e_target ON e_target.id = $2
         WHERE sa.user_id = $1
           AND sa.event_id <> $2
           AND sa.confirmation_status = 'confirmed'
           AND e_existing.status <> 'cancelled'
           AND e_existing.event_date = e_target.event_date
           AND e_existing.start_time < e_target.end_time
           AND e_existing.end_time > e_target.start_time
           AND ($3::int IS NULL OR sa.id <> $3)
         LIMIT 1`,
        [userId, eventId, excludeAssignmentId]
    );

    return overlapQuery.rows.length > 0;
}

function isWorkerUnavailableForEvent(worker, eventDate) {
    if (!worker) {
        return true;
    }

    if (worker.is_available_for_shifts === false) {
        return true;
    }

    if (!worker.unavailable_from || !worker.unavailable_to) {
        return false;
    }

    const eventDateOnly = String(eventDate).split('T')[0];
    const unavailableFrom = String(worker.unavailable_from).split('T')[0];
    const unavailableTo = String(worker.unavailable_to).split('T')[0];

    return eventDateOnly >= unavailableFrom && eventDateOnly <= unavailableTo;
}

function getPayableHoursSql(eventAlias = 'e') {
    return `
        COALESCE(
            NULLIF(sa.hours_worked, 0),
            GREATEST(
                CASE
                    WHEN ${eventAlias}.end_time >= ${eventAlias}.start_time THEN
                        EXTRACT(EPOCH FROM (${eventAlias}.end_time - ${eventAlias}.start_time)) / 3600.0
                    ELSE
                        EXTRACT(EPOCH FROM (((${eventAlias}.event_date::timestamp + ${eventAlias}.end_time) + INTERVAL '1 day') - (${eventAlias}.event_date::timestamp + ${eventAlias}.start_time))) / 3600.0
                END,
                0
            )
        )
    `;
}

// GET all staff assignments
router.get('/', async (req, res) => {
    try {
        await syncEventStatuses(pool);

        const result = await pool.query(
            `SELECT sa.*, u.name as worker_name, u.hourly_rate, e.event_name, e.event_date, e.start_time, e.end_time,
                ${getPayableHoursSql()} AS payable_hours,
                ${getPayableHoursSql()} * COALESCE(u.hourly_rate, 0) AS estimated_earnings
             FROM staff_assignments sa
             JOIN users u ON sa.user_id = u.id
             JOIN events e ON sa.event_id = e.id
             ORDER BY e.event_date DESC`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET assignments for a specific event
router.get('/event/:eventId', async (req, res) => {
    try {
        await syncEventStatuses(pool);

        const { eventId } = req.params;
        const result = await pool.query(
            `SELECT sa.*, u.name as worker_name, u.phone, u.hourly_rate,
                ${getPayableHoursSql()} AS payable_hours,
                ${getPayableHoursSql()} * COALESCE(u.hourly_rate, 0) AS estimated_earnings
             FROM staff_assignments sa
             JOIN users u ON sa.user_id = u.id
             JOIN events e ON sa.event_id = e.id
             WHERE sa.event_id = $1`,
            [eventId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET assignments for a specific user
router.get('/user/:userId', async (req, res) => {
    try {
        await syncEventStatuses(pool);

        const { userId } = req.params;
        const result = await pool.query(
            `SELECT sa.*, e.event_name, e.event_date, e.start_time, e.end_time, e.location,
                u.hourly_rate,
                ${getPayableHoursSql()} AS payable_hours,
                ${getPayableHoursSql()} * COALESCE(u.hourly_rate, 0) AS estimated_earnings
             FROM staff_assignments sa
             JOIN events e ON sa.event_id = e.id
             JOIN users u ON sa.user_id = u.id
             WHERE sa.user_id = $1
             ORDER BY e.event_date DESC`,
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET work history for a specific user (completed events only)
router.get('/user/:userId/history', async (req, res) => {
    try {
        await syncEventStatuses(pool);

        const { userId } = req.params;
        const result = await pool.query(
            `SELECT sa.*, e.event_name, e.event_date, e.start_time, e.end_time, e.location,
                u.hourly_rate,
                ${getPayableHoursSql()} AS payable_hours,
                ${getPayableHoursSql()} * COALESCE(u.hourly_rate, 0) AS estimated_earnings
             FROM staff_assignments sa
             JOIN events e ON sa.event_id = e.id
             JOIN users u ON sa.user_id = u.id
             WHERE sa.user_id = $1
               AND e.status = 'completed'
             ORDER BY e.event_date DESC`,
            [userId]
        );

        const totalResult = await pool.query(
            `SELECT COALESCE(SUM((${getPayableHoursSql('e')}) * COALESCE(u.hourly_rate, 0)), 0) AS total_earnings
             FROM staff_assignments sa
             JOIN events e ON sa.event_id = e.id
             JOIN users u ON sa.user_id = u.id
             WHERE sa.user_id = $1
               AND e.status = 'completed'`,
            [userId]
        );

        res.json({ assignments: result.rows, total_earnings: Number(totalResult.rows[0].total_earnings || 0) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE new staff assignment
router.post('/', async (req, res) => {
    try {
        const { event_id, user_id, role_for_event, confirmation_status } = req.body;

        await syncEventStatuses(pool);

        const event = await getEventById(event_id);

        if (!event) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (event.status === 'cancelled' || event.status === 'completed') {
            return res.status(400).json({ error: 'Cannot assign staff to cancelled or completed events' });
        }

        const worker = await getWorkerById(user_id);

        if (!worker) {
            return res.status(404).json({ error: 'Worker not found' });
        }

        if (worker.role !== 'worker') {
            return res.status(400).json({ error: 'Assignments can only be created for workers' });
        }

        const targetStatus = confirmation_status || 'pending';

        if (targetStatus === 'confirmed') {
            if (isWorkerUnavailableForEvent(worker, event.event_date)) {
                return res.status(409).json({ error: 'Worker is unavailable for this event date' });
            }

            const conflictFound = await hasShiftConflict({ userId: user_id, eventId: event_id });
            if (conflictFound) {
                return res.status(409).json({ error: 'Worker has a conflicting confirmed shift' });
            }
        }
        
        const result = await pool.query(
            `INSERT INTO staff_assignments (event_id, user_id, role_for_event, confirmation_status) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [event_id, user_id, role_for_event, targetStatus]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE staff assignment (for confirmations and hours worked)
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { confirmation_status, hours_worked, role_for_event } = req.body;

        await syncEventStatuses(pool);

        const assignmentResult = await pool.query(
            `SELECT sa.*, e.event_date, e.status AS event_status
             FROM staff_assignments sa
             JOIN events e ON e.id = sa.event_id
             WHERE sa.id = $1`,
            [id]
        );

        if (assignmentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }

        const assignment = assignmentResult.rows[0];

        if (assignment.event_status === 'cancelled' || assignment.event_status === 'completed') {
            return res.status(400).json({ error: 'Cannot modify assignments for cancelled or completed events' });
        }

        if (confirmation_status === 'confirmed') {
            const worker = await getWorkerById(assignment.user_id);
            if (isWorkerUnavailableForEvent(worker, assignment.event_date)) {
                return res.status(409).json({ error: 'Worker is unavailable for this event date' });
            }

            const conflictFound = await hasShiftConflict({
                userId: assignment.user_id,
                eventId: assignment.event_id,
                excludeAssignmentId: Number(id),
            });

            if (conflictFound) {
                return res.status(409).json({ error: 'Worker has a conflicting confirmed shift' });
            }
        }
        
        const result = await pool.query(
            `UPDATE staff_assignments 
             SET confirmation_status = $1, hours_worked = $2, role_for_event = $3
             WHERE id = $4 RETURNING *`,
            [confirmation_status, hours_worked, role_for_event, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE staff assignment
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM staff_assignments WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Assignment not found' });
        }
        
        res.json({ message: 'Assignment deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;