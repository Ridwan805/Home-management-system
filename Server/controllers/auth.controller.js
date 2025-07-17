const Owner = require('../models/owner.model');
const bcrypt = require('bcrypt');

const register = async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        return res.status(400).json({ message: 'Name and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const owner = new Owner({ name, password: hashedPassword });
        await owner.save();
        res.status(201).json({ message: 'Registration successful', id: owner._id });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ message: 'Name already exists' });
        }
        res.status(500).json({ message: 'Error in registration' });
    }
};

const login = async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        return res.status(400).json({ message: 'Name and password are required' });
    }

    try {
        const owner = await Owner.findOne({ name });
        if (!owner) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, owner.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        res.json({ message: 'Login successful', id: owner._id });
    } catch (err) {
        res.status(500).json({ message: 'Error in login' });
    }
};

module.exports = {
    register,
    login
};
