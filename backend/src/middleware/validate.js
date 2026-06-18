const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body);
        next();
    } catch (err) {
        res.status(400).json({
            message: 'Validation failed',
            errors: err.errors?.map(e => ({ path: e.path.join('.'), message: e.message })) || [{ message: err.message }],
        });
    }
};

module.exports = validate;
