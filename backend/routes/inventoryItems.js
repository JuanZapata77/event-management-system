const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// GET all inventory items
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM inventory_items ORDER BY item_name');
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET single inventory item by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM inventory_items WHERE id = $1', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// CREATE new inventory item
router.post('/', async (req, res) => {
    try {
        const { item_name, category, quantity_available, unit, minimum_threshold } = req.body;
        
        const result = await pool.query(
            `INSERT INTO inventory_items (item_name, category, quantity_available, unit, minimum_threshold) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [item_name, category, quantity_available, unit, minimum_threshold]
        );
        
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// UPDATE inventory item
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { item_name, category, quantity_available, unit, minimum_threshold } = req.body;
        
        const result = await pool.query(
            `UPDATE inventory_items 
             SET item_name = $1, category = $2, quantity_available = $3, unit = $4, minimum_threshold = $5
             WHERE id = $6 RETURNING *`,
            [item_name, category, quantity_available, unit, minimum_threshold, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// DELETE inventory item
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM inventory_items WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        
        res.json({ message: 'Item deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;