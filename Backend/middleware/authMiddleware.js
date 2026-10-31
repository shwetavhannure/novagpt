import jwt from "jsonwebtoken";

const getJwtSecret = () => {
    const key = process.env.JWT_SECRET_KEY || process.env.JWT_SECRET;
    return (key && key.trim()) ? key.trim() : "novagpt_dummy_secure_jwt_secret_key_2026";
};

const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ message: "Access denied. No token provided." });
        }

        const token = authHeader.split(" ")[1];
        const secret = getJwtSecret();
        const decoded = jwt.verify(token, secret);
        
        req.userId = decoded.id; // Attach user ID to the request object
        req.userEmail = decoded.email;
        next();
    } catch (err) {
        return res.status(403).json({ message: "Invalid or expired token." });
    }
};

export default authMiddleware;
