const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all event inventory
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ei.*, ii.item_name, ii.category, e.event_name 
             FROM event_inventory ei
             JOIN inventory_items ii ON ei.inventory_item_id = ii.id
             JOIN events e ON ei.event_id = e.id`
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET inventory for a specific event
router.get('/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const result = await pool.query(
            `SELECT ei.*, ii.item_name, ii.category, ii.unit, ii.quantity_available
             FROM event_inventory ei
             JOIN inventory_items ii ON ei.inventory_item_id = ii.id
             WHERE ei.event_id = $1`,
            [eventId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE new event inventory item
router.post('/', async (req, res) => {
    try {
        const { event_id, inventory_item_id, quantity_needed } = req.body;
        
        const result = await pool.query(
            `INSERT INTO event_inventory (event_id, inventory_item_id, quantity_needed) 
             VALUES ($1, $2, $3) RETURNING *`,
            [event_id, inventory_item_id, quantity_needed]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE event inventory
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity_needed, quantity_used } = req.body;
        
        const result = await pool.query(
            `UPDATE event_inventory 
             SET quantity_needed = $1, quantity_used = $2
             WHERE id = $3 RETURNING *`,
            [quantity_needed, quantity_used, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event inventory not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE event inventory item
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM event_inventory WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event inventory not found' });
        }
        
        res.json({ message: 'Event inventory deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;