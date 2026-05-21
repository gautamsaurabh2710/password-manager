const Password = require("../models/password");

const {encrypt, decrypt} = require("../services/encryptionService");

exports.addPassword = async (req,res) => {
    try {
        const {website, username, password} = req.body;

        const encryptedPassword = encrypt(password);

        const savedPassword = await Password.create({userId: req.user.userId, website, username, encryptedPassword});

        res.status(201).json(savedPassword);

    }catch (error) {
        res.status(500).json({error: "Failed to add password"});

    }
};

exports.getPasswords = async (req, res) => {
    try{

        const passwords = await Password.find({userId: req.user.userId});

        const result = passwords.map(item => ({
            ...item._doc, decryptedPassword: decrypt(item.encryptedPassword)
        }));

        res.status(200).json(result);

    }catch(error){
        res.status(500).json({error: "Failed to retrieve passwords"});
    }
};